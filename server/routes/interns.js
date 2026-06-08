const express = require('express')
const internQueries = require('../db/queries/interns')
const { verifyToken, verifyAdmin } = require('../middleware/auth')
const upload = require('../middleware/upload')
const router = express.Router()

// GET /api/interns — admin gets all, intern gets own
router.get('/', verifyToken, async (req, res) => {
  try {
    let interns
    if (req.user.role === 'admin') {
      interns = await internQueries.getAllInterns()
    } else {
      const intern = await internQueries.getInternById(req.user.intern_id)
      interns = intern ? [intern] : []
    }
    res.json(interns)
  } catch (err) {
    console.error('Error fetching interns:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/interns/batch/:batchNumber — get all interns in a batch
router.get('/batch/:batchNumber', verifyToken, async (req, res) => {
  try {
    const interns = await internQueries.getInternsByBatch(req.params.batchNumber)
    res.json(interns)
  } catch (err) {
    console.error('Error fetching interns by batch:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/interns/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'intern' && req.params.id !== req.user.intern_id) {
      return res.status(403).json({ error: 'Access denied: cannot view other profiles directly' })
    }
    const intern = await internQueries.getInternById(req.params.id)
    if (!intern) {
      return res.status(404).json({ error: 'Intern not found' })
    }
    res.json(intern)
  } catch (err) {
    console.error('Error fetching intern by ID:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/interns/:id/photo — serves photo as binary image stream (public)
router.get('/:id/photo', async (req, res) => {
  try {
    const { id } = req.params
    const row = await internQueries.getInternPhoto(id)

    if (!row) {
      return res.status(404).json({ error: 'Intern not found' })
    }

    if (!row.photo) {
      return res.status(404).json({ error: 'No photo found for this intern' })
    }

    // Convert bytea to Buffer
    const photoBuffer = Buffer.isBuffer(row.photo)
      ? row.photo
      : Buffer.from(row.photo)

    res.writeHead(200, {
      'Content-Type': row.photo_mime_type || 'image/jpeg',
      'Content-Length': photoBuffer.length,
      'Cache-Control': 'public, max-age=86400'
    })
    res.end(photoBuffer)
  } catch (err) {
    console.error('Photo fetch error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/interns/:id — update intern details
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    let merged

    if (req.user.role === 'intern') {
      if (id !== req.user.intern_id) {
        return res.status(403).json({ error: 'Access denied: cannot modify other profiles' })
      }
      const current = await internQueries.getInternById(id)
      if (!current) {
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
        return res.status(400).json({ error: 'Required fields are missing' })
      }

      merged = {
        name, college_name, dept, year, sem, mail, number,
        starting_date, ending_date, batch_number, status, profile_visible
      }
    }

    const updated = await internQueries.updateIntern(id, merged)
    res.json({ success: true, intern: updated })
  } catch (err) {
    console.error('Error updating intern:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/interns/:id/photo — admin updates intern photo
router.put(
  '/:id/photo',
  verifyToken,
  verifyAdmin,
  upload.single('photo'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }
      const { id } = req.params
      await internQueries.updateInternPhoto(id, req.file.buffer, req.file.mimetype)
      res.json({ success: true, message: 'Photo updated successfully' })
    } catch (err) {
      console.error('Photo update error:', err.message)
      res.status(500).json({ error: err.message })
    }
  }
)

// PUT /api/interns/:id/approve — admin approves intern status
router.put('/:id/approve', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const updated = await internQueries.updateInternStatus(id, 'approved')
    if (!updated) {
      return res.status(404).json({ error: 'Intern not found' })
    }
    res.json({ success: true, intern: updated })
  } catch (err) {
    console.error('Approval error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/interns/:id — admin rejects/deletes intern
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const deleted = await internQueries.deleteIntern(req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Intern not found' })
    }
    res.json({ success: true, message: 'Intern deleted' })
  } catch (err) {
    console.error('Delete intern error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
