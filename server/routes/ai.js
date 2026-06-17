const express = require('express')
const { verifyToken, verifyAdmin } = require('../middleware/auth')
const router = express.Router()

// POST /api/ai/generate-tasks — stub, replace with real AI call later
router.post('/generate-tasks', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { startingDate, endingDate, projectTitle, projectDescription } = req.body
    if (!startingDate || !endingDate || !projectTitle) {
      return res.status(400).json({ error: 'startingDate, endingDate, and projectTitle are required' })
    }

    // Generate weekday-only dates between start and end
    const dates = []
    let current = new Date(startingDate)
    const end = new Date(endingDate)
    while (current <= end) {
      const day = current.getDay()
      if (day !== 0 && day !== 6) {
        dates.push(new Date(current).toISOString().split('T')[0])
      }
      current.setDate(current.getDate() + 1)
    }

    // STUB: replace this block with a real AI API call (Claude/OpenAI) later.
    // For now generate placeholder sequential tasks based on the project context.
    const tasks = dates.map((date, index) => ({
      title: `${projectTitle} — Day ${index + 1} task`,
      expected_date: date
    }))

    res.json({ tasks })
  } catch (err) {
    console.error('AI task generation error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
