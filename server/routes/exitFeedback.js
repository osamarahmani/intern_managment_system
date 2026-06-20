const express = require('express')
const pool = require('../db/pool')
const { verifyToken, verifyAdmin } = require('../middleware/auth')
const router = express.Router()

// POST /api/exit-feedback — intern submits (or resubmits within 7 days)
router.post('/', verifyToken, async (req, res) => {
  if (req.user.role !== 'intern') {
    return res.status(403).json({ error: 'Only interns can submit exit feedback' })
  }
  const intern_id = req.user.intern_id
  try {
    // Check intern is completed
    const internRes = await pool.query(
      `SELECT intern_status FROM interns WHERE id = $1`,
      [intern_id]
    )
    if (!internRes.rows[0] || internRes.rows[0].intern_status !== 'completed') {
      return res.status(403).json({ error: 'Exit feedback is only available after your internship is marked complete.' })
    }

    // Check if already submitted — allow edit within 7 days
    const existing = await pool.query(
      `SELECT submitted_at FROM intern_exit_feedback WHERE intern_id = $1`,
      [intern_id]
    )
    if (existing.rows[0]) {
      const submittedAt = new Date(existing.rows[0].submitted_at)
      const sevenDaysLater = new Date(submittedAt)
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
      if (new Date() > sevenDaysLater) {
        return res.status(403).json({ error: 'Edit window has closed. Feedback can only be edited within 7 days of submission.' })
      }
    }

    const {
      photo_consent, satisfaction_score, mentor_support,
      learning_areas, rating_clarity, rating_resources,
      rating_worklife, rating_culture, recommend_score,
      testimonial, improvement
    } = req.body

    if (!photo_consent || !satisfaction_score || !mentor_support ||
        !learning_areas?.length || !rating_clarity || !rating_resources ||
        !rating_worklife || !rating_culture || !recommend_score ||
        !testimonial?.trim() || !improvement?.trim()) {
      return res.status(400).json({ error: 'All fields are required.' })
    }

    await pool.query(
      `INSERT INTO intern_exit_feedback
        (intern_id, photo_consent, satisfaction_score, mentor_support, learning_areas,
         rating_clarity, rating_resources, rating_worklife, rating_culture,
         recommend_score, testimonial, improvement, submitted_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
       ON CONFLICT (intern_id) DO UPDATE SET
         photo_consent = $2, satisfaction_score = $3, mentor_support = $4,
         learning_areas = $5, rating_clarity = $6, rating_resources = $7,
         rating_worklife = $8, rating_culture = $9, recommend_score = $10,
         testimonial = $11, improvement = $12, updated_at = NOW()`,
      [intern_id, photo_consent, satisfaction_score, mentor_support,
       learning_areas, rating_clarity, rating_resources, rating_worklife,
       rating_culture, recommend_score, testimonial.trim(), improvement.trim()]
    )

    res.json({ success: true, message: 'Feedback submitted successfully.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/exit-feedback/mine — intern views their own submission
router.get('/mine', verifyToken, async (req, res) => {
  if (req.user.role !== 'intern') {
    return res.status(403).json({ error: 'Access denied' })
  }
  try {
    const result = await pool.query(
      `SELECT * FROM intern_exit_feedback WHERE intern_id = $1`,
      [req.user.intern_id]
    )
    res.json(result.rows[0] || null)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/exit-feedback — admin/super_admin views all submissions
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, i.name, i.mail, i.college_name, i.dept, i.batch_number,
              i.starting_date, i.ending_date
       FROM intern_exit_feedback f
       JOIN interns i ON i.id = f.intern_id
       ORDER BY f.submitted_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/exit-feedback/:internId — admin gets one intern's exit feedback
router.get('/:internId', verifyToken, verifyAdmin, async (req, res) => {
  const { internId } = req.params
  try {
    const result = await pool.query(
      `SELECT * FROM intern_exit_feedback WHERE intern_id = $1`,
      [internId]
    )
    res.json(result.rows[0] || null)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

