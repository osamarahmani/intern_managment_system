const express = require('express')
const internQueries = require('../db/queries/interns')
const { verifyToken, verifyAdmin, verifyTeammateAccess } = require('../middleware/auth')
const { requireInternManagement } = require('../middleware/authorization')
const upload = require('../middleware/upload')
const pool = require('../db/pool')
const logger = require('../utils/logger')
const { isValidImage } = require('../middleware/security')
const router = express.Router()

// GET /api/interns — admin gets all, intern gets own
router.get('/', verifyToken, async (req, res) => {
  logger.info('interns.getAll', 'Fetching interns', { role: req.user.role, intern_id: req.user.intern_id })
  try {
    let interns
    if (req.user.role === 'super_admin') {
      interns = await internQueries.getAllInterns()
    } else if (req.user.role === 'admin') {
      interns = await internQueries.getInternsByAdmin(req.user.id)
    } else {
      const intern = await internQueries.getInternById(req.user.intern_id)
      interns = intern ? [intern] : []
    }
    logger.success('interns.getAll', 'Fetched interns successfully', { count: interns.length })
    res.json(interns)
  } catch (err) {
    logger.error('interns.getAll', 'Failed to fetch interns', { error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/interns/batch/:batchNumber — get all interns in a batch
router.get('/batch/:batchNumber', verifyToken, async (req, res) => {
  const { batchNumber } = req.params
  const requestedBatchId = req.query.batch_id
  logger.info('interns.getByBatch', 'Fetching interns by batch', { batchNumber, requestedBatchId })
  try {
    let batch = null
    if (req.user.role === 'intern') {
      const own = await internQueries.getInternById(req.user.intern_id)
      if (!own || own.batch_number !== batchNumber) return res.status(403).json({ error: 'Access denied' })
      batch = { id: own.batch_id, batch_number: own.batch_number }
    } else if (req.user.role === 'admin') {
      const owned = await pool.query(
        'SELECT id, batch_number, visibility_mode FROM batches WHERE LOWER(batch_number) = LOWER($1) AND created_by = $2 LIMIT 1',
        [batchNumber, req.user.id]
      )
      if (!owned.rowCount) return res.status(403).json({ error: 'Access denied' })
      batch = owned.rows[0]
    } else if (req.user.role === 'super_admin') {
      const params = requestedBatchId ? [requestedBatchId] : [batchNumber]
      const query = requestedBatchId
        ? 'SELECT id, batch_number, visibility_mode FROM batches WHERE id = $1 LIMIT 1'
        : 'SELECT id, batch_number, visibility_mode FROM batches WHERE LOWER(batch_number) = LOWER($1) ORDER BY created_at DESC'
      const found = await pool.query(query, params)
      if (!found.rowCount) return res.status(404).json({ error: 'Batch not found' })
      if (!requestedBatchId && found.rowCount > 1) {
        return res.status(400).json({ error: 'Multiple batches exist with this name. Please select the exact batch card again.' })
      }
      batch = found.rows[0]
    }

    let interns = batch?.id
      ? await internQueries.getInternsByBatchId(batch.id)
      : await internQueries.getInternsByBatch(batchNumber)

    if (req.user.role === 'intern') {
      const batchResult = await pool.query('SELECT visibility_mode FROM batches WHERE id = $1', [batch.id])
      const mode = batchResult.rows[0]?.visibility_mode || 'intern_choice'
      if (mode === 'private') interns = interns.filter(i => i.id === req.user.intern_id)
      if (mode === 'intern_choice') interns = interns.filter(i => i.id === req.user.intern_id || i.profile_visible === true)
    }
    logger.success('interns.getByBatch', 'Fetched interns by batch successfully', { batchNumber, count: interns.length })
    res.json(interns)
  } catch (err) {
    logger.error('interns.getByBatch', 'Failed to fetch interns by batch', { batchNumber, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/interns/archived — protected by verifyToken + verifyAdmin
router.get('/archived', verifyToken, verifyAdmin, async (req, res) => {
  logger.info('interns.getArchived', 'Fetching archived interns')
  try {
    const archived = req.user.role === 'super_admin'
      ? await internQueries.getArchivedInterns()
      : await internQueries.getInternsByAdmin(req.user.id, true)
    logger.success('interns.getArchived', 'Fetched archived interns successfully', { count: archived.length })
    res.json(archived)
  } catch (err) {
    logger.error('interns.getArchived', 'Failed to fetch archived interns', { error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/interns/:id
router.get('/:id', verifyToken, verifyTeammateAccess, async (req, res) => {
  const { id } = req.params
  logger.info('interns.getById', 'Fetching intern by ID', { id })
  try {
    const intern = await internQueries.getInternById(id)
    if (!intern) {
      logger.warn('interns.getById', 'Intern not found', { id })
      return res.status(404).json({ error: 'Intern not found' })
    }
    logger.success('interns.getById', 'Fetched intern by ID successfully', { id })
    res.json(intern)
  } catch (err) {
    logger.error('interns.getById', 'Failed to fetch intern by ID', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/interns/:id/photo — serves an authorized photo stream
router.get('/:id/photo', verifyToken, verifyTeammateAccess, async (req, res) => {
  const { id } = req.params
  logger.info('interns.getPhoto', 'Fetching intern photo', { id })
  try {
    const row = await internQueries.getInternPhoto(id)

    if (!row) {
      logger.warn('interns.getPhoto', 'Intern not found', { id })
      return res.status(404).json({ error: 'Intern not found' })
    }

    if (!row.photo) {
      logger.warn('interns.getPhoto', 'No photo found for this intern', { id })
      return res.status(404).json({ error: 'No photo found for this intern' })
    }

    // Convert bytea to Buffer
    const photoBuffer = Buffer.isBuffer(row.photo)
      ? row.photo
      : Buffer.from(row.photo)

    logger.success('interns.getPhoto', 'Served intern photo', { id, size: photoBuffer.length })
    res.writeHead(200, {
      'Content-Type': row.photo_mime_type || 'image/jpeg',
      'Content-Length': photoBuffer.length,
      'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
      'X-Content-Type-Options': 'nosniff'
    })
    res.end(photoBuffer)
  } catch (err) {
    logger.error('interns.getPhoto', 'Photo fetch failed', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/interns/:id — update intern details
router.put('/:id', verifyToken, requireInternManagement('id'), async (req, res) => {
  const { id } = req.params
  logger.info('interns.update', 'Updating intern details', { id, role: req.user.role })
  try {
    let merged

    if (req.user.role === 'intern') {
      if (id !== req.user.intern_id) {
        logger.warn('interns.update', 'Access denied: cannot modify other profiles', { id, intern_id: req.user.intern_id })
        return res.status(403).json({ error: 'Access denied: cannot modify other profiles' })
      }
      if (typeof req.body.profile_visible !== 'boolean') {
        return res.status(400).json({ error: 'Profile visibility must be true or false' })
      }
      const current = await internQueries.getInternById(id)
      if (!current) {
        logger.warn('interns.update', 'Intern not found', { id })
        return res.status(404).json({ error: 'Intern not found' })
      }
      // Intern is only allowed to toggle their profile visibility setting
      merged = {
        ...current,
        profile_visible: req.body.profile_visible
      }
    } else {
      // Admin can update everything
      const {
        name, college_name, dept, year, sem, mail, number,
        starting_date, ending_date, batch_number, status, profile_visible
      } = req.body

      // Validation
      if (!name || !college_name || !dept || !year || !sem || !mail || !number || !starting_date || !ending_date || !batch_number) {
        logger.warn('interns.update', 'Required fields are missing', { id })
        return res.status(400).json({ error: 'Required fields are missing' })
      }
      if (req.user.role === 'admin') {
        const targetBatch = await pool.query(
          'SELECT id FROM batches WHERE LOWER(batch_number) = LOWER($1) AND created_by = $2 LIMIT 1',
          [batch_number, req.user.id]
        )
        if (!targetBatch.rowCount) return res.status(403).json({ error: 'Cannot move an intern to a batch you do not manage' })
        req.body.batch_id = targetBatch.rows[0].id
      } else if (req.user.role === 'super_admin') {
        const current = await internQueries.getInternById(id)
        if (req.body.batch_id) {
          const targetBatch = await pool.query('SELECT id FROM batches WHERE id = $1 LIMIT 1', [req.body.batch_id])
          if (!targetBatch.rowCount) return res.status(400).json({ error: 'Selected batch was not found' })
          req.body.batch_id = targetBatch.rows[0].id
        } else if (current?.batch_number?.toLowerCase() === String(batch_number).toLowerCase()) {
          req.body.batch_id = current.batch_id
        } else {
          const targetBatch = await pool.query(
            'SELECT id FROM batches WHERE LOWER(batch_number) = LOWER($1) ORDER BY created_at DESC',
            [batch_number]
          )
          if (targetBatch.rowCount > 1) return res.status(400).json({ error: 'Multiple batches exist with this name. Select a specific batch before moving this intern.' })
          req.body.batch_id = targetBatch.rows[0]?.id || null
        }
      }
      if (status && !['pending', 'approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid intern status' })
      if (name.length > 120 || college_name.length > 200 || dept.length > 120 || mail.length > 254 || number.length > 40) {
        return res.status(400).json({ error: 'One or more fields are too long' })
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(starting_date) || !/^\d{4}-\d{2}-\d{2}$/.test(ending_date) || ending_date < starting_date) {
        return res.status(400).json({ error: 'Enter a valid internship date range' })
      }

      merged = {
        name, college_name, dept, year, sem, mail, number,
        starting_date, ending_date, batch_id: req.body.batch_id || null, batch_number, status, profile_visible
      }
    }

    const updated = await internQueries.updateIntern(id, merged)
    logger.success('interns.update', 'Intern updated successfully', { id })
    res.json({ success: true, intern: updated })
  } catch (err) {
    logger.error('interns.update', 'Error updating intern', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/interns/:id/photo — admin updates intern photo
router.put(
  '/:id/photo',
  verifyToken,
  verifyAdmin,
  requireInternManagement('id'),
  upload.single('photo'),
  async (req, res) => {
    const { id } = req.params
    logger.info('interns.updatePhoto', 'Updating intern photo', { id })
    try {
      if (!req.file) {
        logger.warn('interns.updatePhoto', 'No file uploaded', { id })
        return res.status(400).json({ error: 'No file uploaded' })
      }
      if (!isValidImage(req.file)) return res.status(400).json({ error: 'Invalid image file' })
      await internQueries.updateInternPhoto(id, req.file.buffer, req.file.mimetype)
      logger.success('interns.updatePhoto', 'Photo updated successfully', { id })
      res.json({ success: true, message: 'Photo updated successfully' })
    } catch (err) {
      logger.error('interns.updatePhoto', 'Photo update error', { id, error: err.message })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// PUT /api/interns/:id/approve — admin approves intern status
router.put('/:id/approve', verifyToken, verifyAdmin, requireInternManagement('id'), async (req, res) => {
  const { id } = req.params
  logger.info('interns.approve', 'Approving intern', { id })
  try {
    const updated = await internQueries.updateInternStatus(id, 'approved')
    if (!updated) {
      logger.warn('interns.approve', 'Intern not found for approval', { id })
      return res.status(404).json({ error: 'Intern not found' })
    }
    logger.success('interns.approve', 'Intern approved successfully', { id })
    res.json({ success: true, intern: updated })
  } catch (err) {
    logger.error('interns.approve', 'Approval error', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/interns/:id — admin rejects/deletes intern
router.delete('/:id', verifyToken, verifyAdmin, requireInternManagement('id'), async (req, res) => {
  const { id } = req.params
  logger.info('interns.delete', 'Deleting intern (reject/delete)', { id })
  try {
    const deleted = await internQueries.deleteIntern(id)
    if (!deleted) {
      logger.warn('interns.delete', 'Intern not found for deletion', { id })
      return res.status(404).json({ error: 'Intern not found' })
    }
    logger.success('interns.delete', 'Intern deleted successfully', { id })
    res.json({ success: true, message: 'Intern deleted' })
  } catch (err) {
    logger.error('interns.delete', 'Delete intern error', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/interns/:id/archive — protected by verifyToken + verifyAdmin
router.patch('/:id/archive', verifyToken, verifyAdmin, requireInternManagement('id'), async (req, res) => {
  const { id } = req.params
  logger.info('interns.archive', 'Archiving intern', { id })
  try {
    const updated = await internQueries.archiveIntern(id)
    if (!updated) {
      logger.warn('interns.archive', 'Intern not found for archive', { id })
      return res.status(404).json({ error: 'Intern not found' })
    }
    logger.success('interns.archive', 'Intern archived successfully', { id })
    res.json({ success: true, intern: updated })
  } catch (err) {
    logger.error('interns.archive', 'Archive intern error', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/interns/:id/restore — protected by verifyToken + verifyAdmin
router.patch('/:id/restore', verifyToken, verifyAdmin, requireInternManagement('id'), async (req, res) => {
  const { id } = req.params
  logger.info('interns.restore', 'Restoring intern', { id })
  try {
    const updated = await internQueries.restoreIntern(id)
    if (!updated) {
      logger.warn('interns.restore', 'Intern not found for restore', { id })
      return res.status(404).json({ error: 'Intern not found' })
    }
    logger.success('interns.restore', 'Intern restored successfully', { id })
    res.json({ success: true, intern: updated })
  } catch (err) {
    logger.error('interns.restore', 'Restore intern error', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/interns/:id/permanent — protected by verifyToken + verifyAdmin
router.delete('/:id/permanent', verifyToken, verifyAdmin, requireInternManagement('id'), async (req, res) => {
  const { id } = req.params
  logger.info('interns.deletePermanent', 'Permanently deleting intern', { id })
  try {
    const deleted = await internQueries.permanentDeleteIntern(id)
    if (!deleted) {
      logger.warn('interns.deletePermanent', 'Intern not found for permanent deletion', { id })
      return res.status(404).json({ error: 'Intern not found' })
    }
    logger.success('interns.deletePermanent', 'Intern permanently deleted successfully', { id })
    res.json({ success: true, message: 'Intern permanently deleted' })
  } catch (err) {
    logger.error('interns.deletePermanent', 'Permanent delete intern error', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/interns/:id/complete — admin marks internship as completed and gives feedback
router.put('/:id/complete', verifyToken, verifyAdmin, requireInternManagement('id'), async (req, res) => {
  const { id } = req.params
  logger.info('interns.complete', 'Marking internship as completed', { id })
  try {
    const { rating, feedback } = req.body
    if (!rating || !feedback) {
      logger.warn('interns.complete', 'Rating and feedback are required', { id })
      return res.status(400).json({ error: 'Rating and feedback are required' })
    }
    if (rating < 1 || rating > 5) {
      logger.warn('interns.complete', 'Rating must be between 1 and 5', { id, rating })
      return res.status(400).json({ error: 'Rating must be between 1 and 5' })
    }

    const adminProfileId = req.user.profileId || req.user.id

    const db = await pool.connect()
    try {
      await db.query('BEGIN')
      const updated = await db.query(
        `UPDATE interns SET intern_status = 'completed', feedback_given_at = NOW() WHERE id = $1 RETURNING id`,
        [id]
      )
      if (!updated.rowCount) {
        await db.query('ROLLBACK')
        return res.status(404).json({ error: 'Intern not found' })
      }
      await db.query(
        `INSERT INTO intern_feedback (intern_id, given_by, rating, feedback)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (intern_id) DO UPDATE SET rating = $3, feedback = $4, given_by = $2, given_at = NOW()`,
        [id, adminProfileId, rating, feedback.trim().slice(0, 10000)]
      )
      await db.query('COMMIT')
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    } finally {
      db.release()
    }

    logger.success('interns.complete', 'Internship marked as completed with feedback', { id })
    res.json({ success: true, message: 'Internship marked as completed with feedback' })
  } catch (err) {
    logger.error('interns.complete', 'Complete internship error', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/interns/:id/discontinue — admin marks intern as discontinued with reason
router.put('/:id/discontinue', verifyToken, verifyAdmin, requireInternManagement('id'), async (req, res) => {
  const { id } = req.params
  logger.info('interns.discontinue', 'Marking intern as discontinued', { id })
  try {
    const { reason } = req.body
    if (!reason || !reason.trim()) {
      logger.warn('interns.discontinue', 'Reason is required', { id })
      return res.status(400).json({ error: 'Reason is required' })
    }

    await pool.query(
      `UPDATE interns SET intern_status = 'discontinued', discontinued_reason = $1, login_blocked = true WHERE id = $2`,
      [reason.trim(), id]
    )

    logger.success('interns.discontinue', 'Intern marked as discontinued successfully', { id })
    res.json({ success: true, message: 'Intern marked as discontinued' })
  } catch (err) {
    logger.error('interns.discontinue', 'Discontinue intern error', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/interns/:id/feedback — get feedback for an intern (intern or admin)
router.get('/:id/feedback', verifyToken, requireInternManagement('id'), async (req, res) => {
  const { id } = req.params
  logger.info('interns.getFeedback', 'Fetching feedback for intern', { id })
  try {
    const result = await pool.query(
      `SELECT f.*, p.name as given_by_name
       FROM intern_feedback f
       LEFT JOIN profiles p ON p.id = f.given_by
       WHERE f.intern_id = $1`,
      [id]
    )
    if (!result.rows[0]) {
      logger.warn('interns.getFeedback', 'No feedback found', { id })
      return res.status(404).json({ error: 'No feedback found' })
    }
    logger.success('interns.getFeedback', 'Fetched feedback successfully', { id })
    res.json(result.rows[0])
  } catch (err) {
    logger.error('interns.getFeedback', 'Failed to fetch feedback', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/interns/:id/revoke-discontinue — admin restores a discontinued intern
router.put('/:id/revoke-discontinue', verifyToken, verifyAdmin, requireInternManagement('id'), async (req, res) => {
  const { id } = req.params
  logger.info('interns.revokeDiscontinue', 'Revoking discontinue status', { id })
  try {
    await pool.query(
      `UPDATE interns SET intern_status = 'active', discontinued_reason = NULL, login_blocked = false WHERE id = $1`,
      [id]
    )
    logger.success('interns.revokeDiscontinue', 'Discontinue status revoked successfully', { id })
    res.json({ success: true, message: 'Discontinue revoked successfully' })
  } catch (err) {
    logger.error('interns.revokeDiscontinue', 'Failed to revoke discontinue status', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
