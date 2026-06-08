const express = require('express')
const batchQueries = require('../db/queries/batches')
const { verifyToken, verifyAdmin } = require('../middleware/auth')
const router = express.Router()

// GET /api/batches — Fetch all batches
router.get('/', verifyToken, async (req, res) => {
  try {
    const batches = await batchQueries.getAllBatches()
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
    const batch = await batchQueries.createBatch({
      batch_number: batch_number.trim(),
      registration_key: registration_key.trim()
    })
    res.json(batch)
  } catch (err) {
    console.error('Error creating batch:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/batches/:id — Update batch status/visibility (Admin only)
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { is_active, visibility_mode } = req.body

  if (is_active === undefined || !visibility_mode) {
    return res.status(400).json({ error: 'Is Active and Visibility Mode are required' })
  }

  try {
    const batch = await batchQueries.updateBatch(req.params.id, {
      is_active,
      visibility_mode
    })
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' })
    }
    res.json(batch)
  } catch (err) {
    console.error('Error updating batch:', err.message)
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
