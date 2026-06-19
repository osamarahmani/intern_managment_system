const express = require('express')
const batchQueries = require('../db/queries/batches')
const { verifyToken, verifyAdmin } = require('../middleware/auth')
const { requireBatchManagement } = require('../middleware/authorization')
const pool = require('../db/pool')
const logger = require('../utils/logger')
const router = express.Router()

// GET /api/batches — Fetch all batches
router.get('/', verifyToken, async (req, res) => {
  logger.info('batches.getAll', 'Fetching batches', { role: req.user.role, id: req.user.id })
  try {
    let batches
    if (req.user.role === 'super_admin') {
      batches = await batchQueries.getAllBatches()
    } else if (req.user.role === 'admin') {
      batches = await batchQueries.getBatchesByAdmin(req.user.id)
    } else {
      const own = await pool.query(
        `SELECT b.id, b.batch_number, b.is_active, b.visibility_mode, b.is_archived,
                b.created_at, b.archived_at
         FROM batches b JOIN interns i ON i.batch_number = b.batch_number
         WHERE i.id = $1`,
        [req.user.intern_id]
      )
      batches = own.rows
    }
    logger.success('batches.getAll', 'Fetched batches successfully', { count: batches.length })
    res.json(batches)
  } catch (err) {
    logger.error('batches.getAll', 'Failed to fetch batches', { error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/batches/archived - Fetch archived batches
router.get('/archived', verifyToken, verifyAdmin, async (req, res) => {
  logger.info('batches.getArchived', 'Fetching archived batches', { role: req.user.role, id: req.user.id })
  try {
    const archived = await batchQueries.getArchivedBatches(
      req.user.id,
      req.user.role === 'super_admin'
    )
    logger.success('batches.getArchived', 'Fetched archived batches successfully', { count: archived.length })
    res.json(archived)
  } catch (err) {
    logger.error('batches.getArchived', 'Failed to fetch archived batches', { error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/batches — Create batch (Admin only)
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  const { batch_number, registration_key } = req.body
  logger.info('batches.create', 'Creating batch', { batch_number, created_by: req.user.id })

  if (!batch_number || !registration_key) {
    logger.warn('batches.create', 'Batch number and registration key are required', { batch_number })
    return res.status(400).json({ error: 'Batch number and registration key are required' })
  }
  if (batch_number.trim().length > 100 || registration_key.trim().length < 12 || registration_key.trim().length > 200) {
    return res.status(400).json({ error: 'Batch number must be under 100 characters and registration key at least 12 characters' })
  }

  try {
    const batch = await batchQueries.createBatch(
      batch_number.trim(),
      registration_key.trim(),
      req.user.id
    )
    logger.success('batches.create', 'Batch created successfully', { batch_id: batch.id, batch_number })
    res.json(batch)
  } catch (err) {
    logger.error('batches.create', 'Failed to create batch', { batch_number, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/batches/:id — Update batch status/visibility/mentor (Admin only)
router.put('/:id', verifyToken, verifyAdmin, requireBatchManagement('id'), async (req, res) => {
  const { id } = req.params
  logger.info('batches.update', 'Updating batch', { id })
  try {
    const { is_active, visibility_mode, created_by } = req.body
    if (visibility_mode && !['public', 'private', 'intern_choice'].includes(visibility_mode)) {
      return res.status(400).json({ error: 'Invalid visibility mode' })
    }
    if (created_by && req.user.role !== 'super_admin') return res.status(403).json({ error: 'Only a super admin can reassign a batch' })
    const result = await pool.query(
      `UPDATE batches SET
        is_active = COALESCE($1, is_active),
        visibility_mode = COALESCE($2, visibility_mode),
        created_by = COALESCE($3, created_by)
       WHERE id = $4 RETURNING *`,
      [is_active ?? null, visibility_mode ?? null, created_by ?? null, id]
    )
    if (!result.rows[0]) {
      logger.warn('batches.update', 'Batch not found', { id })
      return res.status(404).json({ error: 'Batch not found' })
    }
    logger.success('batches.update', 'Batch updated successfully', { id })
    res.json(result.rows[0])
  } catch (err) {
    logger.error('batches.update', 'Failed to update batch', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/batches/:id/archive - Archive batch (Admin only)
router.patch('/:id/archive', verifyToken, verifyAdmin, requireBatchManagement('id'), async (req, res) => {
  const { id } = req.params
  logger.info('batches.archive', 'Archiving batch', { id })
  try {
    const archived = await batchQueries.archiveBatch(id)
    if (!archived) {
      logger.warn('batches.archive', 'Batch not found', { id })
      return res.status(404).json({ error: 'Batch not found' })
    }
    logger.success('batches.archive', 'Batch archived successfully', { id })
    res.json({ success: true, batch: archived })
  } catch (err) {
    logger.error('batches.archive', 'Error archiving batch', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/batches/:id/restore - Restore archived batch (Admin only)
router.patch('/:id/restore', verifyToken, verifyAdmin, requireBatchManagement('id'), async (req, res) => {
  const { id } = req.params
  logger.info('batches.restore', 'Restoring batch', { id })
  try {
    const restored = await batchQueries.restoreBatch(id)
    if (!restored) {
      logger.warn('batches.restore', 'Batch not found', { id })
      return res.status(404).json({ error: 'Batch not found' })
    }
    logger.success('batches.restore', 'Batch restored successfully', { id })
    res.json({ success: true, batch: restored })
  } catch (err) {
    logger.error('batches.restore', 'Error restoring batch', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/batches/:id/permanent - Permanently delete archived batch
router.delete('/:id/permanent', verifyToken, verifyAdmin, requireBatchManagement('id'), async (req, res) => {
  const { id } = req.params
  logger.info('batches.deletePermanent', 'Permanently deleting batch', { id })
  try {
    const deleted = await batchQueries.deleteBatch(id)
    if (!deleted) {
      logger.warn('batches.deletePermanent', 'Batch not found', { id })
      return res.status(404).json({ error: 'Batch not found' })
    }
    logger.success('batches.deletePermanent', 'Batch permanently deleted successfully', { id })
    res.json({ success: true, message: 'Batch permanently deleted' })
  } catch (err) {
    logger.error('batches.deletePermanent', 'Error permanently deleting batch', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/batches/:id — Delete batch (Admin only)
router.delete('/:id', verifyToken, verifyAdmin, requireBatchManagement('id'), async (req, res) => {
  const { id } = req.params
  logger.info('batches.delete', 'Deleting batch', { id })
  try {
    const deleted = await batchQueries.deleteBatch(id)
    if (!deleted) {
      logger.warn('batches.delete', 'Batch not found', { id })
      return res.status(404).json({ error: 'Batch not found' })
    }
    logger.success('batches.delete', 'Batch deleted successfully', { id })
    res.json({ success: true, message: 'Batch deleted' })
  } catch (err) {
    logger.error('batches.delete', 'Error deleting batch', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
