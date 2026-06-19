const express = require('express')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const adminQueries = require('../db/queries/admins')
const { verifyToken, verifySuperAdmin } = require('../middleware/auth')
const { sendAdminCredentials } = require('../utils/mailer')
const logger = require('../utils/logger')
const router = express.Router()

router.get('/', verifyToken, verifySuperAdmin, async (req, res) => {
  logger.info('admins.getAll', 'Fetching all admins')
  try {
    const admins = await adminQueries.getAllAdmins()
    logger.success('admins.getAll', 'Fetched all admins successfully', { count: admins.length })
    res.json(admins)
  } catch (err) {
    logger.error('admins.getAll', 'Failed to fetch admins', { error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', verifyToken, verifySuperAdmin, async (req, res) => {
  const { name, email } = req.body
  const normalizedEmail = String(email || '').trim().toLowerCase()
  logger.info('admins.create', 'Creating admin', { email, name })
  if (!name || !email) {
    logger.warn('admins.create', 'Name and email are required', { email })
    return res.status(400).json({ error: 'Name and email are required' })
  }
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || normalizedEmail.length > 254 || name.trim().length > 120) {
    return res.status(400).json({ error: 'Enter a valid name and email address' })
  }

  try {
    const existing = await adminQueries.getAdminByEmail(normalizedEmail)
    if (existing) {
      logger.warn('admins.create', 'Admin with this email already exists', { email })
      return res.status(400).json({ error: 'Admin with this email already exists' })
    }

    // Generate random 12-char password
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$'
    const password = Array.from(crypto.randomFillSync(new Uint32Array(12)))
      .map((x) => chars[x % chars.length])
      .join('')

    const hashedPassword = await bcrypt.hash(password, 12)
    const newAdmin = await adminQueries.createAdmin(name.trim(), normalizedEmail, hashedPassword)
    logger.success('admins.create', 'Admin created successfully', { email, id: newAdmin.id })
    res.status(201).json(newAdmin)

    // Send email in background
    sendAdminCredentials(normalizedEmail, name.trim(), password).then(() => {
      logger.info('admins.create', 'Admin credentials email sent successfully', { email })
    }).catch((mailErr) => {
      logger.error('admins.create', 'Failed to send credentials email', {
        email,
        error: mailErr.message,
        code: mailErr.code
      })
    })
  } catch (err) {
    logger.error('admins.create', 'Error creating admin', { email, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', verifyToken, verifySuperAdmin, async (req, res) => {
  const { id } = req.params
  logger.info('admins.delete', 'Deleting admin', { id })
  try {
    const deleted = await adminQueries.deleteAdmin(id)
    if (!deleted) {
      logger.warn('admins.delete', 'Admin not found', { id })
      return res.status(404).json({ error: 'Admin not found' })
    }
    logger.success('admins.delete', 'Admin deleted successfully', { id })
    res.json({ success: true, message: 'Admin deleted successfully' })
  } catch (err) {
    logger.error('admins.delete', 'Error deleting admin', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
