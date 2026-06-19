const express = require('express')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const upload = require('../middleware/upload')
const userQueries = require('../db/queries/users')
const internQueries = require('../db/queries/interns')
const batchQueries = require('../db/queries/batches')
const pool = require('../db/pool')
const { sendPasswordReset } = require('../utils/mailer')
const { verifyToken } = require('../middleware/auth')
const logger = require('../utils/logger')
const { issueAccessToken } = require('../utils/tokens')
const { rateLimit, isValidImage } = require('../middleware/security')
const { setAuthCookie, clearAuthCookie } = require('../utils/authCookie')
const router = express.Router()

const accountKey = req => `${req.ip}:${String(req.body?.email || '').trim().toLowerCase()}`
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, name: 'login', keyGenerator: accountKey })
const registrationLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, name: 'registration' })
const resetLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 6, name: 'password-reset', keyGenerator: accountKey })

// POST /api/auth/login (Admin / Super Admin only)
router.post('/login', loginLimit, async (req, res) => {
  const { email, password } = req.body
  const normalizedEmail = String(email || '').trim().toLowerCase()
  logger.info('auth.login', 'Admin login attempt', { email })

  if (!email || !password) {
    logger.warn('auth.login', 'Email and password are required', { email })
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const adminQueries = require('../db/queries/admins')
    const user = await adminQueries.getAdminByEmail(normalizedEmail)

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

    // Check if admin must change password (only for admin, not super_admin)
    if (user.role === 'admin' && user.must_change_password) {
      const tempToken = issueAccessToken({
        id: user.id, email: user.email || email, role: user.role,
        token_version: user.token_version || 0, must_change_password: true
      }, { temporary: true })
      setAuthCookie(res, tempToken, true)
      logger.success('auth.login', 'Temporary admin token generated, password change required', { email })
      return res.json({ 
        token: 'session',
        role: user.role, 
        must_change_password: true 
      })
    }

    const token = issueAccessToken({
      id: user.id, email: user.email || email, role: user.role,
      token_version: user.token_version || 0
    })
    setAuthCookie(res, token)

    logger.success('auth.login', 'Admin login successful', { email, role: user.role })
    res.json({ token: 'session', role: user.role })
  } catch (err) {
    logger.error('auth.login', 'Login failed with exception', { email, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/auth/intern-login (Approved Interns only)
router.post('/intern-login', loginLimit, async (req, res) => {
  const { email, password } = req.body
  const normalizedEmail = String(email || '').trim().toLowerCase()
  logger.info('auth.intern-login', 'Intern login attempt', { email })

  if (!email || !password) {
    logger.warn('auth.intern-login', 'Email and password are required', { email })
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const user = await userQueries.getUserByEmail(normalizedEmail)
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

    const token = issueAccessToken({
      id: user.id, email: user.email || email, role: user.role,
      intern_id: user.intern_id || null, token_version: user.token_version || 0
    })
    setAuthCookie(res, token)

    logger.success('auth.intern-login', 'Intern login successful', { email, intern_id: user.intern_id })
    res.json({ token: 'session', role: user.role, intern_id: user.intern_id || null })
  } catch (err) {
    logger.error('auth.intern-login', 'Intern login failed with exception', { email, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/auth/change-password
router.post('/change-password', verifyToken, async (req, res) => {
  logger.info('auth.change-password', 'Change password attempt', { user_id: req.user.id })
  try {
    if (!req.user.must_change_password) return res.status(403).json({ error: 'Use the password reset flow to change this password' })
    const { newPassword } = req.body
    if (!newPassword || newPassword.length < 12) {
      logger.warn('auth.change-password', 'Invalid password length', { user_id: req.user.id })
      return res.status(400).json({ error: 'Password must be at least 12 characters' })
    }
    const hashed = await bcrypt.hash(newPassword, 12)
    let updated
    if (req.user.role === 'intern') {
      updated = await pool.query(
        'UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2 RETURNING email, role, intern_id, token_version',
        [hashed, req.user.id]
      )
    } else {
      updated = await pool.query(
        'UPDATE profiles SET password = $1, must_change_password = false, token_version = token_version + 1 WHERE id = $2 RETURNING email, role, token_version',
        [hashed, req.user.id]
      )
    }
    if (!updated.rows[0]) return res.status(404).json({ error: 'Account not found' })
    const account = updated.rows[0]
    const token = issueAccessToken({
      id: req.user.id, email: account.email, role: account.role,
      intern_id: account.intern_id || undefined, token_version: account.token_version
    })
    setAuthCookie(res, token)
    logger.success('auth.change-password', 'Password changed successfully', { user_id: req.user.id })
    res.json({ success: true, token: 'session', role: account.role, intern_id: account.intern_id || null })
  } catch (err) {
    logger.error('auth.change-password', 'Change password failed', { user_id: req.user.id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/logout', (req, res) => {
  clearAuthCookie(res)
  res.json({ success: true })
})

// POST /api/auth/register
router.post('/register', registrationLimit, upload.single('photo'), async (req, res) => {
  const {
    name, college_name, dept, year, sem,
    mail, number, starting_date, ending_date,
    batch_number, registration_key, password
  } = req.body
  const normalizedMail = String(mail || '').trim().toLowerCase()
  logger.info('auth.register', 'Register attempt', { name, mail, batch_number })

  // Input Validation
  if (!name || !college_name || !dept || !year || !sem || !mail || !number || !starting_date || !ending_date || !batch_number || !registration_key || !password) {
    logger.warn('auth.register', 'Missing fields', { mail })
    return res.status(400).json({ error: 'All fields are required' })
  }

  if (password.length < 12) {
    logger.warn('auth.register', 'Password too short', { mail })
    return res.status(400).json({ error: 'Password must be at least 12 characters' })
  }

  if (!/^\S+@\S+\.\S+$/.test(normalizedMail) || normalizedMail.length > 254) {
    logger.warn('auth.register', 'Invalid email format', { mail })
    return res.status(400).json({ error: 'Please enter a valid email address' })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(starting_date) || !/^\d{4}-\d{2}-\d{2}$/.test(ending_date) || ending_date < starting_date) {
    return res.status(400).json({ error: 'Enter a valid internship date range' })
  }
  if (name.length > 120 || college_name.length > 200 || dept.length > 120 || number.length > 40) {
    return res.status(400).json({ error: 'One or more fields are too long' })
  }

  try {
    if (req.file && !isValidImage(req.file)) return res.status(400).json({ error: 'Invalid image file' })
    // Verify registration key and batch active status
    const batch = await batchQueries.getBatchByNumberAndKey(batch_number, registration_key)
    if (!batch) {
      logger.warn('auth.register', 'Invalid batch or registration key', { mail, batch_number })
      return res.status(400).json({ error: 'Invalid batch number or registration key' })
    }

    // Check if user already exists
    const existingUser = await userQueries.getUserByEmail(normalizedMail)
    if (existingUser) {
      logger.warn('auth.register', 'Email already registered', { mail })
      return res.status(400).json({ error: 'Email already registered' })
    }

    // Photo buffer from multer memory storage
    const photoBuffer = req.file ? req.file.buffer : null
    const photoMimeType = req.file ? req.file.mimetype : null

    // Hash password
    const password_hash = await bcrypt.hash(password, 12)

    const dbClient = await pool.connect()
    let internId
    try {
      await dbClient.query('BEGIN')
      internId = await internQueries.createIntern({
        name, college_name, dept, year, sem: parseInt(sem, 10), mail: normalizedMail, number,
        starting_date, ending_date, batch_number, photo: photoBuffer,
        photo_mime_type: photoMimeType
      }, dbClient)
      await userQueries.createUser({
        email: normalizedMail, password_hash, role: 'intern', intern_id: internId
      }, dbClient)
      await dbClient.query('COMMIT')
    } catch (error) {
      await dbClient.query('ROLLBACK')
      throw error
    } finally {
      dbClient.release()
    }

    logger.success('auth.register', 'Registration successful, pending admin approval', { mail, intern_id: internId })
    res.json({ success: true, intern_id: internId, message: 'Registration successful. Await admin approval.' })
  } catch (err) {
    logger.error('auth.register', 'Registration failed', { mail, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/auth/forgot-password
router.post('/forgot-password', resetLimit, async (req, res) => {
  const { email } = req.body
  const normalizedEmail = String(email || '').trim().toLowerCase()
  logger.info('auth.forgot-password', 'Forgot password request', { email })
  if (!email) {
    logger.warn('auth.forgot-password', 'Missing email parameter')
    return res.status(400).json({ error: 'Email is required' })
  }

  try {
    const adminQueries = require('../db/queries/admins')
    const admin = await adminQueries.getAdminByEmail(normalizedEmail)
    const user = await userQueries.getUserByEmail(normalizedEmail)
    const intern = await internQueries.getInternByEmail(normalizedEmail)

    if (!admin && !user) {
      logger.warn('auth.forgot-password', 'User not found, simulating success response', { email })
      return res.json({ success: true, message: 'If this email is registered, a reset link has been sent to your inbox.' })
    }

    if (user && user.role === 'intern' && intern && intern.is_archived === true) {
      return res.json({ success: true, message: 'If this email is registered, a reset link has been sent to your inbox.' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 3600000) // 1 hour

    await pool.query(
      'INSERT INTO password_reset_tokens (email, token, expires_at) VALUES ($1, $2, $3)',
      [normalizedEmail, tokenHash, expiresAt]
    )

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
    const resetLink = `${clientUrl.replace(/\/$/, '')}/#reset-token=${token}`

    try {
      await sendPasswordReset(normalizedEmail, resetLink)
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
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', resetLimit, async (req, res) => {
  const { token, newPassword } = req.body
  logger.info('auth.reset-password', 'Reset password attempt')

  if (!token || !newPassword) {
    logger.warn('auth.reset-password', 'Missing token or password')
    return res.status(400).json({ error: 'Token and new password are required' })
  }

  if (newPassword.length < 12) {
    logger.warn('auth.reset-password', 'Password too short')
    return res.status(400).json({ error: 'Password must be at least 12 characters' })
  }

  let dbClient
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    dbClient = await pool.connect()
    await dbClient.query('BEGIN')
    const tokenResult = await dbClient.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW() FOR UPDATE',
      [tokenHash]
    )
    const resetToken = tokenResult.rows[0]

    if (!resetToken) {
      await dbClient.query('ROLLBACK')
      dbClient.release()
      dbClient = null
      logger.warn('auth.reset-password', 'Invalid or expired token')
      return res.status(400).json({ error: 'Invalid or expired password reset token' })
    }

    const { email } = resetToken
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    const adminResult = await dbClient.query("SELECT id FROM profiles WHERE email = $1 AND role IN ('admin','super_admin')", [email])
    const userResult = await dbClient.query('SELECT id FROM users WHERE email = $1', [email])
    const admin = adminResult.rows[0]
    const user = userResult.rows[0]

    if (!admin && !user) {
      logger.warn('auth.reset-password', 'Account not found for email associated with token', { email })
      await dbClient.query('ROLLBACK')
      dbClient.release()
      dbClient = null
      return res.status(404).json({ error: 'Account not found' })
    }

    if (admin) {
      await dbClient.query(
        'UPDATE profiles SET password = $1, must_change_password = false, token_version = token_version + 1 WHERE email = $2',
        [hashedPassword, email]
      )
      logger.info('auth.reset-password', 'Updated admin profile password', { email })
    } else if (user) {
      await dbClient.query(
        'UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE email = $2',
        [hashedPassword, email]
      )
      logger.info('auth.reset-password', 'Updated user password', { email })
    }

    await dbClient.query(
      'UPDATE password_reset_tokens SET used = true WHERE email = $1 AND used = false',
      [email]
    )
    await dbClient.query('COMMIT')
    dbClient.release()
    dbClient = null

    logger.success('auth.reset-password', 'Password reset successful', { email })
    res.json({ success: true, message: 'Password has been reset successfully' })
  } catch (err) {
    if (dbClient) {
      await dbClient.query('ROLLBACK').catch(() => {})
      dbClient.release()
    }
    logger.error('auth.reset-password', 'Reset password failed', { error: err.message })
    res.status(500).json({ error: 'Unable to reset password' })
  }
})

module.exports = router
