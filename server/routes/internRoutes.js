const express = require('express')
const pool = require('../db/pool')
const { verifyToken, verifyAdmin } = require('../middleware/auth')
const router = express.Router()

// GET /api/interns — admin gets all, intern gets own
router.get('/', verifyToken, async (req, res) => {
  try {
    let result
    if (req.user.role === 'admin') {
      result = await pool.query(
        'SELECT id, name, college_name, dept, year, sem, mail, number, starting_date, ending_date, batch_number, status, profile_visible, photo_mime_type, created_at FROM interns ORDER BY created_at DESC'
      )
    } else {
      result = await pool.query(
        'SELECT id, name, college_name, dept, year, sem, mail, number, starting_date, ending_date, batch_number, status, profile_visible, photo_mime_type, created_at FROM interns WHERE id = $1',
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
       profile_visible, photo_mime_type, created_at
       FROM interns WHERE batch_number = $1 AND status = 'approved'
       ORDER BY created_at DESC`,
      [req.params.batchNumber]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/interns/:id/photo — serve photo as image
router.get('/:id/photo', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT photo, photo_mime_type FROM interns WHERE id = $1',
      [req.params.id]
    )
    const intern = result.rows[0]
    if (!intern || !intern.photo) {
      return res.status(404).json({ error: 'No photo found' })
    }
    res.set('Content-Type', intern.photo_mime_type || 'image/jpeg')
    res.send(intern.photo)
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
       profile_visible, photo_mime_type, created_at
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
    status, profile_visible, photo, photo_mime_type
  } = req.body
  try {
    if (photo) {
      await pool.query(
        `UPDATE interns SET name=$1, college_name=$2, dept=$3, year=$4, sem=$5,
         mail=$6, number=$7, starting_date=$8, ending_date=$9,
         batch_number=$10, status=$11, profile_visible=$12,
         photo=$13, photo_mime_type=$14 WHERE id=$15`,
        [name, college_name, dept, year, sem, mail, number,
         starting_date, ending_date, batch_number, status, profile_visible,
         Buffer.from(photo, 'base64'), photo_mime_type, req.params.id]
      )
    } else {
      await pool.query(
        `UPDATE interns SET name=$1, college_name=$2, dept=$3, year=$4, sem=$5,
         mail=$6, number=$7, starting_date=$8, ending_date=$9,
         batch_number=$10, status=$11, profile_visible=$12 WHERE id=$13`,
        [name, college_name, dept, year, sem, mail, number,
         starting_date, ending_date, batch_number, status, profile_visible,
         req.params.id]
      )
    }
    res.json({ success: true })
  } catch (err) {
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
