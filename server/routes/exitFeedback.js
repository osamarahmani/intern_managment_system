const express = require('express')
const pool = require('../db/pool')
const { verifyToken, verifyAdmin } = require('../middleware/auth')
const router = express.Router()

// POST /api/exit-feedback — intern submits (or resubmits within 7 days)
router.post('/', verifyToken, async (req, res) => {
  console.log('[exit-feedback POST] user from token:', req.user)
  if (req.user.role?.toLowerCase() !== 'intern') {
    console.log('[exit-feedback POST] REJECTED: role is', req.user.role)
    return res.status(403).json({ error: 'Only interns can submit exit feedback' })
  }
  const intern_id = req.user.intern_id || req.user.id || req.user.userId
  try {
    const internRes = await pool.query(
      `SELECT intern_status, ending_date FROM interns WHERE id = $1`, [intern_id]
    )
    console.log('[exit-feedback POST] intern record:', internRes.rows[0])
    const intern = internRes.rows[0]
    const isCompleted = intern?.intern_status?.toLowerCase() === 'completed'
    const isOver = intern?.ending_date && new Date() > new Date(intern.ending_date)
    if (!intern || (!isCompleted && !isOver)) {
      console.log('[exit-feedback POST] REJECTED: intern_status is', intern?.intern_status, 'ending_date is', intern?.ending_date)
      return res.status(403).json({ error: `Exit feedback is only available after your internship is marked complete or the internship date is over.` })
    }

    const existing = await pool.query(
      `SELECT submitted_at FROM intern_exit_feedback WHERE intern_id = $1`, [intern_id]
    )
    if (existing.rows[0]) {
      const sevenDaysLater = new Date(existing.rows[0].submitted_at)
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
      if (new Date() > sevenDaysLater) {
        return res.status(403).json({ error: 'Edit window has closed. Feedback can only be edited within 7 days of submission.' })
      }
    }

    const {
      intern_name, contact_number, email, college_name, department, role_title,
      start_date, end_date, overall_satisfaction, mentor_supportiveness,
      learning_areas, rating_clarity, rating_resources, rating_work_life_balance,
      rating_team_integration, recommendation_rating, testimonial,
      improvement_suggestion, consent
    } = req.body

    const parsedAreas = typeof learning_areas === 'string'
      ? JSON.parse(learning_areas)
      : learning_areas || []

    await pool.query(
      `INSERT INTO intern_exit_feedback (
        intern_id, intern_name, contact_number, email, college_name, department, role_title,
        start_date, end_date, overall_satisfaction, mentor_supportiveness, learning_areas,
        rating_clarity, rating_resources, rating_work_life_balance, rating_team_integration,
        recommendation_rating, testimonial, improvement_suggestion, consent,
        submitted_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW(),NOW()
      )
      ON CONFLICT (intern_id) DO UPDATE SET
        intern_name=$2, contact_number=$3, email=$4, college_name=$5, department=$6,
        role_title=$7, start_date=$8, end_date=$9,
        overall_satisfaction=$10, mentor_supportiveness=$11, learning_areas=$12,
        rating_clarity=$13, rating_resources=$14, rating_work_life_balance=$15,
        rating_team_integration=$16, recommendation_rating=$17, testimonial=$18,
        improvement_suggestion=$19, consent=$20, updated_at=NOW()`,
      [
        intern_id, intern_name, contact_number, email, college_name, department, role_title,
        start_date, end_date,
        parseInt(overall_satisfaction), mentor_supportiveness, parsedAreas,
        rating_clarity, rating_resources, rating_work_life_balance, rating_team_integration,
        parseInt(recommendation_rating), testimonial, improvement_suggestion, consent
      ]
    )

    res.json({ success: true, message: 'Feedback submitted successfully.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/exit-feedback/mine — intern views own submission
router.get('/mine', verifyToken, async (req, res) => {
  console.log('[exit-feedback/mine] user from token:', req.user)
  if (req.user.role?.toLowerCase() !== 'intern') {
    console.log('[exit-feedback/mine] REJECTED: role is', req.user.role)
    return res.status(403).json({ error: 'Access denied' })
  }
  try {
    const intern_id = req.user.intern_id || req.user.id || req.user.userId
    const result = await pool.query(
      `SELECT * FROM intern_exit_feedback WHERE intern_id = $1`, [intern_id]
    )
    res.json(result.rows[0] || null)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/exit-feedback — admin views all submissions
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, i.batch_number FROM intern_exit_feedback f
       JOIN interns i ON i.id = f.intern_id
       ORDER BY f.submitted_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/exit-feedback/:internId — admin views one intern's submission
// MUST be registered after /mine and / to avoid route conflicts
router.get('/:internId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM intern_exit_feedback WHERE intern_id = $1`, [req.params.internId]
    )
    res.json(result.rows[0] || null)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
