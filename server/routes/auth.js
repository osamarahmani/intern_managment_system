const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const upload = require('../middleware/upload')
const userQueries = require('../db/queries/users')
const internQueries = require('../db/queries/interns')
const batchQueries = require('../db/queries/batches')
const pool = require('../db/pool')
const { sendPasswordReset } = require('../utils/mailer')
const { verifyToken } = require('../middleware/auth')
const router = express.Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    let user = await userQueries.getUserByEmail(email)
    let isProfileAdmin = false
    if (!user) {
      const adminQueries = require('../db/queries/admins')
      user = await adminQueries.getAdminByEmail(email)
      if (user) {
        isProfileAdmin = true
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const passwordHash = isProfileAdmin ? user.password : user.password_hash
    if (!passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, passwordHash)
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
    
    // Check if admin must change password (only for admin, not super_admin)
    if (isProfileAdmin && user.role === 'admin' && user.must_change_password) {
      const tempToken = jwt.sign(
        { id: user.id, email: user.email || email, role: user.role, must_change_password: true },
        secret,
        { expiresIn: '1h' }
      )
      return res.json({ 
        token: tempToken, 
        role: user.role, 
        must_change_password: true 
      })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email || email, role: user.role, intern_id: user.intern_id || null },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.json({ token, role: user.role, intern_id: user.intern_id || null })
  } catch (err) {
    console.error('Login error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { newPassword } = req.body
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const hashed = await bcrypt.hash(newPassword, 10)
    await pool.query(
      'UPDATE profiles SET password = $1, must_change_password = false WHERE id = $2',
      [hashed, req.user.id]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('Change password error:', err.message)
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

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  try {
    const adminQueries = require('../db/queries/admins')
    const admin = await adminQueries.getAdminByEmail(email)
    const user = await userQueries.getUserByEmail(email)

    if (!admin && !user) {
      return res.json({ success: true, message: 'If this email is registered, a reset link has been sent to your inbox.' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 3600000) // 1 hour

    await pool.query(
      'INSERT INTO password_reset_tokens (email, token, expires_at) VALUES ($1, $2, $3)',
      [email, token, expiresAt]
    )

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
    const resetLink = `${clientUrl}?token=${token}`

    try {
      await sendPasswordReset(email, resetLink)
    } catch (mailErr) {
      console.error('Mailer error:', mailErr.message)
    }
    
    res.json({ success: true, message: 'If this email is registered, a reset link has been sent to your inbox.' })
  } catch (err) {
    console.error('Forgot password error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' })
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  try {
    const tokenResult = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW()',
      [token]
    )
    const resetToken = tokenResult.rows[0]

    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' })
    }

    const { email } = resetToken
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    const adminQueries = require('../db/queries/admins')
    const admin = await adminQueries.getAdminByEmail(email)
    const user = await userQueries.getUserByEmail(email)

    if (!admin && !user) {
      return res.status(404).json({ error: 'Account not found' })
    }

    if (admin) {
      await pool.query(
        'UPDATE profiles SET password = $1 WHERE email = $2',
        [hashedPassword, email]
      )
    }

    if (user) {
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [hashedPassword, email]
      )
    }

    await pool.query(
      'UPDATE password_reset_tokens SET used = true WHERE token = $1',
      [token]
    )

    res.json({ success: true, message: 'Password has been reset successfully' })
  } catch (err) {
    console.error('Reset password error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
