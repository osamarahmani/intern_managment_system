const express = require('express')
const pool = require('../db/pool')
const { verifyToken, verifyAdmin } = require('../middleware/auth')
const router = express.Router()

router.get('/intern/:internId', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE intern_id = $1 ORDER BY created_at DESC',
      [req.params.internId]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  const { intern_id, title, expected_date, upcoming_task = false } = req.body
  try {
    const result = await pool.query(
      `INSERT INTO tasks (intern_id, title, expected_date, upcoming_task)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [intern_id, title, expected_date, upcoming_task]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', verifyToken, async (req, res) => {
  const { status, submission_date, title, expected_date, upcoming_task = false } = req.body
  try {
    await pool.query(
      `UPDATE tasks SET status=$1, submission_date=$2,
       title=$3, expected_date=$4, upcoming_task=$5 WHERE id=$6`,
      [status, submission_date, title, expected_date, upcoming_task, req.params.id]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
