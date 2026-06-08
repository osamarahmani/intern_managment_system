const express = require('express')
const pool = require('../db/pool')
const { verifyToken, verifyAdmin } = require('../middleware/auth')
const upload = require('../middleware/upload')
const fs = require('fs')
const path = require('path')
const router = express.Router()

// GET /api/interns — admin gets all, intern gets own
router.get('/', verifyToken, async (req, res) => {
  try {
    let result
    if (req.user.role === 'admin') {
      result = await pool.query(
        'SELECT id, name, college_name, dept, year, sem, mail, number, starting_date, ending_date, batch_number, status, profile_visible, photo_url, created_at FROM interns ORDER BY created_at DESC'
      )
    } else {
      result = await pool.query(
        'SELECT id, name, college_name, dept, year, sem, mail, number, starting_date, ending_date, batch_number, status, profile_visible, photo_url, created_at FROM interns WHERE id = $1',
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
       profile_visible, photo_url, created_at
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
       profile_visible, photo_url, created_at
       FROM interns WHERE id = $1`,
      [req.params.id]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/interns/:id — update intern details
router.put('/:id', verifyToken, async (req, res) => {
  const {
    name, college_name, dept, year, sem, mail, number,
    starting_date, ending_date, batch_number,
    status, profile_visible, photo_url
  } = req.body
  try {
    await pool.query(
      `UPDATE interns SET name=$1, college_name=$2, dept=$3, year=$4, sem=$5,
       mail=$6, number=$7, starting_date=$8, ending_date=$9,
       batch_number=$10, status=$11, profile_visible=$12, photo_url=$13 WHERE id=$14`,
      [name, college_name, dept, year, sem, mail, number,
       starting_date, ending_date, batch_number, status, profile_visible,
       photo_url, req.params.id]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/interns/:id/photo — update/upload profile photo (admin only)
router.put('/:id/photo', verifyToken, verifyAdmin, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { id } = req.params

    // Get old photo URL to delete old file
    const oldResult = await pool.query(
      'SELECT photo_url FROM interns WHERE id = $1',
      [id]
    )

    // Delete old photo file from disk if exists
    if (oldResult.rows[0]?.photo_url) {
      const oldFilename = path.basename(oldResult.rows[0].photo_url)
      const oldPath = path.join(__dirname, '../uploads/photos', oldFilename)
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath)
      }
    }

    // Save new photo URL
    const photoUrl = `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/photos/${req.file.filename}`

    await pool.query(
      'UPDATE interns SET photo_url = $1 WHERE id = $2',
      [photoUrl, id]
    )

    res.json({ success: true, photoUrl })
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    console.error('Photo update error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

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
