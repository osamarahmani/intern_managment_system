const express = require('express')
const batchQueries = require('../db/queries/batches')
const { verifyToken, verifyAdmin } = require('../middleware/auth')
const pool = require('../db/pool')
const router = express.Router()

// GET /api/batches — Fetch all batches
router.get('/', verifyToken, async (req, res) => {
  try {
    let batches
    if (req.user.role === 'super_admin') {
      batches = await batchQueries.getAllBatches()
    } else if (req.user.role === 'admin') {
      batches = await batchQueries.getBatchesByAdmin(req.user.id)
    } else {
      // Default to returning all batches or empty/role-specific fallback
      batches = await batchQueries.getAllBatches()
    }
    res.json(batches)
  } catch (err) {
    console.error('Error fetching batches:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/batches — Create batch (Admin only)
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  const { batch_number, registration_key } = req.body

  if (!batch_number || !registration_key) {
    return res.status(400).json({ error: 'Batch number and registration key are required' })
  }

  try {
    const batch = await batchQueries.createBatch(
      batch_number.trim(),
      registration_key.trim(),
      req.user.id
    )
    res.json(batch)
  } catch (err) {
    console.error('Error creating batch:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/batches/:id — Update batch status/visibility/mentor (Admin only)
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { is_active, visibility_mode, created_by } = req.body
    const result = await pool.query(
      `UPDATE batches SET
        is_active = COALESCE($1, is_active),
        visibility_mode = COALESCE($2, visibility_mode),
        created_by = COALESCE($3, created_by)
       WHERE id = $4 RETURNING *`,
      [is_active ?? null, visibility_mode ?? null, created_by ?? null, req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Batch not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/batches/:id — Delete batch (Admin only)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const deleted = await batchQueries.deleteBatch(req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Batch not found' })
    }
    res.json({ success: true, message: 'Batch deleted' })
  } catch (err) {
    console.error('Error deleting batch:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
