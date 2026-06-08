const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../db/pool')
const upload = require('../middleware/upload')
const fs = require('fs')
const router = express.Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    )
    const user = result.rows[0]
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    // If intern, check status
    if (user.role === 'intern') {
      const internResult = await pool.query(
        'SELECT status FROM interns WHERE id = $1', [user.intern_id]
      )
      const intern = internResult.rows[0]
      if (!intern) return res.status(404).json({ error: 'Intern not found' })
      if (intern.status === 'pending') return res.status(403).json({ error: 'pending' })
      if (intern.status === 'rejected') return res.status(403).json({ error: 'rejected' })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, intern_id: user.intern_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )
    res.json({ token, role: user.role, intern_id: user.intern_id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/register
router.post('/register', upload.single('photo'), async (req, res) => {
  try {
    const {
      name, college_name, dept, year, sem,
      mail, number, starting_date, ending_date,
      batch_number, registration_key, password
    } = req.body

    // Verify registration key
    const batchResult = await pool.query(
      'SELECT * FROM batches WHERE batch_number = $1 AND registration_key = $2 AND is_active = true',
      [batch_number, registration_key]
    )
    if (batchResult.rows.length === 0) {
      // Delete uploaded file if batch validation fails
      if (req.file) fs.unlinkSync(req.file.path)
      return res.status(400).json({ error: 'Invalid batch number or registration key' })
    }

    // Build photo URL
    const photoUrl = req.file
      ? `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/photos/${req.file.filename}`
      : null

    // Hash password
    const password_hash = await bcrypt.hash(password, 10)

    // Insert intern
    const internResult = await pool.query(
      `INSERT INTO interns
       (name, college_name, dept, year, sem, mail, number,
        starting_date, ending_date, batch_number, photo_url, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending')
       RETURNING id`,
      [
        name, college_name, dept, year, sem,
        mail, number, starting_date, ending_date,
        batch_number, photoUrl
      ]
    )

    const internId = internResult.rows[0].id

    // Insert user
    await pool.query(
      'INSERT INTO users (email, password_hash, role, intern_id) VALUES ($1,$2,$3,$4)',
      [mail, password_hash, 'intern', internId]
    )

    res.json({ success: true, intern_id: internId, message: 'Registration successful. Await admin approval.' })
  } catch (err) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    console.error('Registration error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
