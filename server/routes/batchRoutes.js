const express = require('express')
const pool = require('../db/pool')
const { verifyToken, verifyAdmin } = require('../middleware/auth')
const router = express.Router()

router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM batches ORDER BY created_at DESC')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  const { batch_number, registration_key } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO batches (batch_number, registration_key) VALUES ($1, $2) RETURNING *',
      [batch_number, registration_key]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { is_active, visibility_mode } = req.body
  try {
    const result = await pool.query(
      'UPDATE batches SET is_active=$1, visibility_mode=$2 WHERE id=$3 RETURNING *',
      [is_active, visibility_mode, req.params.id]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM batches WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
