const express = require('express')
const pool = require('../db/pool')
const { verifyToken, verifyAdmin } = require('../middleware/auth')
const upload = require('../middleware/upload')
const router = express.Router()

// GET /api/interns — admin gets all, intern gets own
router.get('/', verifyToken, async (req, res) => {
  try {
    let result
    if (req.user.role === 'admin') {
      result = await pool.query(
        'SELECT id, name, college_name, dept, year, sem, mail, number, starting_date, ending_date, batch_number, status, profile_visible, created_at FROM interns ORDER BY created_at DESC'
      )
    } else {
      result = await pool.query(
        'SELECT id, name, college_name, dept, year, sem, mail, number, starting_date, ending_date, batch_number, status, profile_visible, created_at FROM interns WHERE id = $1',
        [req.user.intern_id]
      )
    }
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/interns/batch/:batchNumber — get all interns in a batch
router.get('/batch/:batchNumber', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, college_name, dept, year, sem, mail, number,
       starting_date, ending_date, batch_number, status,
       profile_visible, created_at
       FROM interns WHERE batch_number = $1 AND status = 'approved'
       ORDER BY created_at DESC`,
      [req.params.batchNumber]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/interns/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, college_name, dept, year, sem, mail, number,
       starting_date, ending_date, batch_number, status,
       profile_visible, created_at
       FROM interns WHERE id = $1`,
      [req.params.id]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/interns/:id/photo — serves photo as image
router.get('/:id/photo', async (req, res) => {
  try {
    const { id } = req.params
    console.log('Photo requested for intern:', id)

    const result = await pool.query(
      'select photo, photo_mime_type from interns where id = $1',
      [id]
    )

    const row = result.rows[0]

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

    console.log('Serving photo — size:', photoBuffer.length, 'bytes')

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
  const {
    name, college_name, dept, year, sem, mail, number,
    starting_date, ending_date, batch_number,
    status, profile_visible
  } = req.body
  try {
    await pool.query(
      `UPDATE interns SET name=$1, college_name=$2, dept=$3, year=$4, sem=$5,
       mail=$6, number=$7, starting_date=$8, ending_date=$9,
       batch_number=$10, status=$11, profile_visible=$12 WHERE id=$13`,
      [name, college_name, dept, year, sem, mail, number,
       starting_date, ending_date, batch_number, status, profile_visible,
       req.params.id]
    )
    res.json({ success: true })
  } catch (err) {
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
      await pool.query(
        'update interns set photo = $1, photo_mime_type = $2 where id = $3',
        [req.file.buffer, req.file.mimetype, id]
      )
      res.json({ success: true, message: 'Photo updated successfully' })
    } catch (err) {
      console.error('Photo update error:', err.message)
      res.status(500).json({ error: err.message })
    }
  }
)

// DELETE /api/interns/:id — admin only
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM interns WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
