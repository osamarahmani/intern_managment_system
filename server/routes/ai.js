const express = require('express')
const Groq = require('groq-sdk')
const { verifyToken, verifyAdmin } = require('../middleware/auth')
const taskQueries = require('../db/queries/tasks')
const logger = require('../utils/logger')
const { canManageIntern } = require('../middleware/authorization')
const { rateLimit } = require('../middleware/security')
const router = express.Router()
const aiLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 12, name: 'ai-generation' })

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Generate weekday-only dates between start and end (timezone-safe, no UTC shift)
const getWeekdayDates = (startingDate, endingDate) => {
  const parseDateParts = (dateStr) => {
    const cleanDateStr = dateStr.split('T')[0].split(' ')[0]
    const [year, month, day] = cleanDateStr.split('-').map(Number)
    return { year, month, day }
  }

  const toDateStr = (year, month, day) => {
    const mm = String(month).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  }

  const getDayOfWeek = (year, month, day) => {
    // Use noon UTC to avoid any timezone boundary issues when computing day-of-week
    const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    return d.getUTCDay()
  }

  const start = parseDateParts(startingDate)
  const end = parseDateParts(endingDate)

  const dates = []
  let cursor = new Date(Date.UTC(start.year, start.month - 1, start.day, 12, 0, 0))
  const endCursor = new Date(Date.UTC(end.year, end.month - 1, end.day, 12, 0, 0))

  while (cursor <= endCursor) {
    const y = cursor.getUTCFullYear()
    const m = cursor.getUTCMonth() + 1
    const d = cursor.getUTCDate()
    const dayOfWeek = getDayOfWeek(y, m, d)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push(toDateStr(y, m, d))
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return dates
}

// POST /api/ai/generate-tasks
router.post('/generate-tasks', verifyToken, verifyAdmin, aiLimit, async (req, res) => {
  const { startingDate, endingDate, projectTitle, projectDescription, intern_id } = req.body
  logger.info('ai.generate-tasks', 'AI task generation started', { projectTitle, intern_id })

  try {
    if (!startingDate || !endingDate || !projectTitle) {
      logger.warn('ai.generate-tasks', 'startingDate, endingDate, and projectTitle are required', { intern_id })
      return res.status(400).json({ error: 'startingDate, endingDate, and projectTitle are required' })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startingDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endingDate)) {
      return res.status(400).json({ error: 'Dates must use YYYY-MM-DD format' })
    }
    if (intern_id && !await canManageIntern(req.user, intern_id)) return res.status(403).json({ error: 'Access denied' })
    if (projectTitle.length > 200 || (projectDescription || '').length > 10000) {
      return res.status(400).json({ error: 'Project content is too long' })
    }

    const dates = getWeekdayDates(startingDate, endingDate)
    if (dates.length === 0) {
      logger.warn('ai.generate-tasks', 'No valid weekdays found between starting and ending date', { startingDate, endingDate })
      return res.status(400).json({ error: 'No valid weekdays found between starting and ending date' })
    }
    if (dates.length > 65) return res.status(400).json({ error: 'AI task plans are limited to 65 working days' })

    const prompt = `Generate exactly ${dates.length} sequential daily internship tasks for this project, one per working day, in logical order (setup → development → testing → documentation).

Project: ${projectTitle}
${projectDescription ? `Context: ${projectDescription.slice(0, 500)}` : ''}

Each task must have:
- "title": short action-oriented title under 80 characters (e.g. "Set up project repository and folder structure")
- "description": a concise 1-2 sentence description of the task.

Return ONLY a valid JSON array, no markdown, no backticks, no explanation. Exactly ${dates.length} items.
Format: [{"title":"short task title","description":"short description here"}]`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a precise JSON generator. You only respond with valid JSON arrays, nothing else.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 4096
    })

    let rawText = completion.choices[0]?.message?.content?.trim() || ''
    // Strip markdown code fences if the model adds them despite instructions
    rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

    // Robustly extract JSON array if conversational text exists around it
    const firstBracket = rawText.indexOf('[');
    const lastBracket = rawText.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      rawText = rawText.substring(firstBracket, lastBracket + 1);
    }

    let taskTitles
    try {
      taskTitles = JSON.parse(rawText)
    } catch (parseErr) {
      logger.error('ai.generate-tasks', 'Failed to parse Groq response', { rawText, error: parseErr.message })
      return res.status(500).json({ error: 'AI returned an invalid response format. Please try again.' })
    }

    if (!Array.isArray(taskTitles)) {
      logger.warn('ai.generate-tasks', 'AI response was not a valid task list', { rawText })
      return res.status(500).json({ error: 'AI response was not a valid task list.' })
    }

    // Map titles to dates, fall back gracefully if AI returned fewer/more items than expected
    const tasks = dates.map((date, index) => ({
      title: String(taskTitles[index]?.title || `${projectTitle} — Day ${index + 1} task`).slice(0, 200),
      description: String(taskTitles[index]?.description || '').slice(0, 2000),
      expected_date: date
    }))

    if (intern_id) {
      const saved = await taskQueries.saveAITaskDrafts(intern_id, tasks)
      logger.success('ai.generate-tasks', 'AI task drafts generated and saved successfully', { intern_id, count: saved.length })
      return res.json({ tasks: saved })
    }
    logger.success('ai.generate-tasks', 'AI task drafts generated successfully (not saved - no intern_id)', { count: tasks.length })
    res.json({ tasks })
  } catch (err) {
    logger.error('ai.generate-tasks', 'AI task generation failed', { error: err.message })
    res.status(500).json({ error: 'Failed to generate AI task plan' })
  }
})

module.exports = router
