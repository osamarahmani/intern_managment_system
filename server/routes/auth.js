const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const upload = require('../middleware/upload')
const userQueries = require('../db/queries/users')
const internQueries = require('../db/queries/interns')
const batchQueries = require('../db/queries/batches')
const router = express.Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const user = await userQueries.getUserByEmail(email)
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // If intern, check status
    if (user.role === 'intern') {
      const intern = await internQueries.getInternById(user.intern_id)
      if (!intern) {
        return res.status(404).json({ error: 'Intern not found' })
      }
      if (intern.status === 'pending') {
        return res.status(403).json({ error: 'pending' })
      }
      if (intern.status === 'rejected') {
        return res.status(403).json({ error: 'rejected' })
      }
    }

    const secret = process.env.JWT_SECRET || 'fallback_secret'
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, intern_id: user.intern_id },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.json({ token, role: user.role, intern_id: user.intern_id })
  } catch (err) {
    console.error('Login error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/register
router.post('/register', upload.single('photo'), async (req, res) => {
  const {
    name, college_name, dept, year, sem,
    mail, number, starting_date, ending_date,
    batch_number, registration_key, password
  } = req.body

  // Input Validation
  if (!name || !college_name || !dept || !year || !sem || !mail || !number || !batch_number || !registration_key || !password) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  if (!/\S+@\S+\.\S+/.test(mail)) {
    return res.status(400).json({ error: 'Please enter a valid email address' })
  }

  try {
    // Verify registration key and batch active status
    const batch = await batchQueries.getBatchByNumberAndKey(batch_number, registration_key)
    if (!batch) {
      return res.status(400).json({ error: 'Invalid batch number or registration key' })
    }

    // Check if user already exists
    const existingUser = await userQueries.getUserByEmail(mail)
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    // Photo buffer from multer memory storage
    const photoBuffer = req.file ? req.file.buffer : null
    const photoMimeType = req.file ? req.file.mimetype : null

    // Hash password
    const password_hash = await bcrypt.hash(password, 10)

    // Insert intern
    const internId = await internQueries.createIntern({
      name,
      college_name,
      dept,
      year,
      sem: parseInt(sem, 10),
      mail,
      number,
      starting_date,
      ending_date,
      batch_number,
      photo: photoBuffer,
      photo_mime_type: photoMimeType
    })

    // Insert user
    await userQueries.createUser({
      email: mail,
      password_hash,
      role: 'intern',
      intern_id: internId
    })

    res.json({ success: true, intern_id: internId, message: 'Registration successful. Await admin approval.' })
  } catch (err) {
    console.error('Registration error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
