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
const logger = require('../utils/logger')
const router = express.Router()

// POST /api/auth/login (Admin / Super Admin only)
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  logger.info('auth.login', 'Admin login attempt', { email })

  if (!email || !password) {
    logger.warn('auth.login', 'Email and password are required', { email })
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const adminQueries = require('../db/queries/admins')
    const user = await adminQueries.getAdminByEmail(email)

    if (!user) {
      logger.warn('auth.login', 'User not found', { email })
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      logger.warn('auth.login', 'Invalid role for admin login', { email, role: user.role })
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      logger.warn('auth.login', 'Invalid credentials - password mismatch', { email })
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const secret = process.env.JWT_SECRET || 'fallback_secret'
    
    // Check if admin must change password (only for admin, not super_admin)
    if (user.role === 'admin' && user.must_change_password) {
      const tempToken = jwt.sign(
        { id: user.id, email: user.email || email, role: user.role, must_change_password: true },
        secret,
        { expiresIn: '1h' }
      )
      logger.success('auth.login', 'Temporary admin token generated, password change required', { email })
      return res.json({ 
        token: tempToken, 
        role: user.role, 
        must_change_password: true 
      })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email || email, role: user.role },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    logger.success('auth.login', 'Admin login successful', { email, role: user.role })
    res.json({ token, role: user.role })
  } catch (err) {
    logger.error('auth.login', 'Login failed with exception', { email, error: err.message })
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/intern-login (Approved Interns only)
router.post('/intern-login', async (req, res) => {
  const { email, password } = req.body
  logger.info('auth.intern-login', 'Intern login attempt', { email })

  if (!email || !password) {
    logger.warn('auth.intern-login', 'Email and password are required', { email })
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const user = await userQueries.getUserByEmail(email)
    if (!user || user.role !== 'intern') {
      logger.warn('auth.intern-login', 'User not found or role is not intern', { email })
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const intern = await internQueries.getInternById(user.intern_id)
    if (!intern) {
      logger.warn('auth.intern-login', 'Intern profile not found for user', { email, intern_id: user.intern_id })
      return res.status(401).json({ error: 'Invalid credentials or account not approved' })
    }
    if (intern.is_archived === true) {
      logger.warn('auth.intern-login', 'Intern account archived', { email, intern_id: user.intern_id })
      return res.status(403).json({ error: 'Your account has been archived. Please contact your admin.' })
    }
    if (intern.status === 'pending') {
      logger.warn('auth.intern-login', 'Intern registration is pending approval', { email, intern_id: user.intern_id })
      return res.status(403).json({ error: 'pending' })
    }
    if (intern.status === 'rejected') {
      logger.warn('auth.intern-login', 'Intern registration rejected', { email, intern_id: user.intern_id })
      return res.status(403).json({ error: 'rejected' })
    }
    if (intern.status !== 'approved') {
      logger.warn('auth.intern-login', 'Intern registration status not approved', { email, status: intern.status })
      return res.status(401).json({ error: 'Invalid credentials or account not approved' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      logger.warn('auth.intern-login', 'Invalid credentials - password mismatch', { email })
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Block discontinued interns
    if (intern.intern_status === 'discontinued' || intern.login_blocked) {
      logger.warn('auth.intern-login', 'Intern login blocked (discontinued or login_blocked)', { email, intern_status: intern.intern_status, login_blocked: intern.login_blocked })
      return res.status(403).json({
        error: 'Your internship has been discontinued. Please contact your admin.',
        reason: intern.discontinued_reason || ''
      })
    }

    // Block interns whose 1-week post-feedback window has expired
    if (intern.feedback_given_at) {
      const oneWeekAfterFeedback = new Date(intern.feedback_given_at)
      oneWeekAfterFeedback.setDate(oneWeekAfterFeedback.getDate() + 7)
      if (new Date() > oneWeekAfterFeedback) {
        logger.warn('auth.intern-login', 'Intern login blocked - feedback access window expired', { email, feedback_given_at: intern.feedback_given_at })
        return res.status(403).json({
          error: 'Your internship access has expired. Thank you for your time with us!',
          expired: true
        })
      }
    }

    const secret = process.env.JWT_SECRET || 'fallback_secret'
    const token = jwt.sign(
      { id: user.id, email: user.email || email, role: user.role, intern_id: user.intern_id || null },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    logger.success('auth.intern-login', 'Intern login successful', { email, intern_id: user.intern_id })
    res.json({ token, role: user.role, intern_id: user.intern_id || null })
  } catch (err) {
    logger.error('auth.intern-login', 'Intern login failed with exception', { email, error: err.message })
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/change-password
router.post('/change-password', verifyToken, async (req, res) => {
  logger.info('auth.change-password', 'Change password attempt', { user_id: req.user.id })
  try {
    const { newPassword } = req.body
    if (!newPassword || newPassword.length < 6) {
      logger.warn('auth.change-password', 'Invalid password length', { user_id: req.user.id })
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const hashed = await bcrypt.hash(newPassword, 10)
    await pool.query(
      'UPDATE profiles SET password = $1, must_change_password = false WHERE id = $2',
      [hashed, req.user.id]
    )
    logger.success('auth.change-password', 'Password changed successfully', { user_id: req.user.id })
    res.json({ success: true })
  } catch (err) {
    logger.error('auth.change-password', 'Change password failed', { user_id: req.user.id, error: err.message })
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
  logger.info('auth.register', 'Register attempt', { name, mail, batch_number })

  // Input Validation
  if (!name || !college_name || !dept || !year || !sem || !mail || !number || !batch_number || !registration_key || !password) {
    logger.warn('auth.register', 'Missing fields', { mail })
    return res.status(400).json({ error: 'All fields are required' })
  }

  if (password.length < 6) {
    logger.warn('auth.register', 'Password too short', { mail })
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  if (!/\S+@\S+\.\S+/.test(mail)) {
    logger.warn('auth.register', 'Invalid email format', { mail })
    return res.status(400).json({ error: 'Please enter a valid email address' })
  }

  try {
    // Verify registration key and batch active status
    const batch = await batchQueries.getBatchByNumberAndKey(batch_number, registration_key)
    if (!batch) {
      logger.warn('auth.register', 'Invalid batch or registration key', { mail, batch_number })
      return res.status(400).json({ error: 'Invalid batch number or registration key' })
    }

    // Check if user already exists
    const existingUser = await userQueries.getUserByEmail(mail)
    if (existingUser) {
      logger.warn('auth.register', 'Email already registered', { mail })
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

    logger.success('auth.register', 'Registration successful, pending admin approval', { mail, intern_id: internId })
    res.json({ success: true, intern_id: internId, message: 'Registration successful. Await admin approval.' })
  } catch (err) {
    logger.error('auth.register', 'Registration failed', { mail, error: err.message })
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  logger.info('auth.forgot-password', 'Forgot password request', { email })
  if (!email) {
    logger.warn('auth.forgot-password', 'Missing email parameter')
    return res.status(400).json({ error: 'Email is required' })
  }

  try {
    const adminQueries = require('../db/queries/admins')
    const admin = await adminQueries.getAdminByEmail(email)
    const user = await userQueries.getUserByEmail(email)
    const intern = await internQueries.getInternByEmail(email)

    if (!admin && !user) {
      logger.warn('auth.forgot-password', 'User not found, simulating success response', { email })
      return res.json({ success: true, message: 'If this email is registered, a reset link has been sent to your inbox.' })
    }

    if (user && user.role === 'intern' && intern && intern.is_archived === true) {
      logger.warn('auth.forgot-password', 'Archived intern requested reset', { email })
      return res.status(403).json({ error: 'Your account has been archived. Please contact your admin.' })
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
      logger.info('auth.forgot-password', 'Reset email sent successfully', { email })
    } catch (mailErr) {
      logger.error('auth.forgot-password', 'Mailer error - Password reset email failed', {
        error: mailErr.message,
        code: mailErr.code,
        email
      })
    }
    
    logger.success('auth.forgot-password', 'Forgot password flow complete', { email })
    res.json({ success: true, message: 'If this email is registered, a reset link has been sent to your inbox.' })
  } catch (err) {
    logger.error('auth.forgot-password', 'Forgot password failed', { email, error: err.message })
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body
  logger.info('auth.reset-password', 'Reset password attempt')

  if (!token || !newPassword) {
    logger.warn('auth.reset-password', 'Missing token or password')
    return res.status(400).json({ error: 'Token and new password are required' })
  }

  if (newPassword.length < 6) {
    logger.warn('auth.reset-password', 'Password too short')
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  try {
    const tokenResult = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW()',
      [token]
    )
    const resetToken = tokenResult.rows[0]

    if (!resetToken) {
      logger.warn('auth.reset-password', 'Invalid or expired token')
      return res.status(400).json({ error: 'Invalid or expired password reset token' })
    }

    const { email } = resetToken
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    const adminQueries = require('../db/queries/admins')
    const admin = await adminQueries.getAdminByEmail(email)
    const user = await userQueries.getUserByEmail(email)

    if (!admin && !user) {
      logger.warn('auth.reset-password', 'Account not found for email associated with token', { email })
      return res.status(404).json({ error: 'Account not found' })
    }

    if (admin) {
      await pool.query(
        'UPDATE profiles SET password = $1 WHERE email = $2',
        [hashedPassword, email]
      )
      logger.info('auth.reset-password', 'Updated admin profile password', { email })
    }

    if (user) {
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [hashedPassword, email]
      )
      logger.info('auth.reset-password', 'Updated user password', { email })
    }

    await pool.query(
      'UPDATE password_reset_tokens SET used = true WHERE token = $1',
      [token]
    )

    logger.success('auth.reset-password', 'Password reset successful', { email })
    res.json({ success: true, message: 'Password has been reset successfully' })
  } catch (err) {
    logger.error('auth.reset-password', 'Reset password failed', { error: err.message })
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
