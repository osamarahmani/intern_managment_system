const express = require('express')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const adminQueries = require('../db/queries/admins')
const { verifyToken, verifySuperAdmin } = require('../middleware/auth')
const { sendAdminCredentials } = require('../utils/mailer')
const router = express.Router()

router.get('/', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const admins = await adminQueries.getAllAdmins()
    res.json(admins)
  } catch (err) {
    console.error('Error getting admins:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.post('/', verifyToken, verifySuperAdmin, async (req, res) => {
  const { name, email } = req.body
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' })
  }

  try {
    const existing = await adminQueries.getAdminByEmail(email)
    if (existing) {
      return res.status(400).json({ error: 'Admin with this email already exists' })
    }

    // Generate random 12-char password
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$'
    const password = Array.from(crypto.randomFillSync(new Uint32Array(12)))
      .map((x) => chars[x % chars.length])
      .join('')

    const hashedPassword = await bcrypt.hash(password, 10)
    const newAdmin = await adminQueries.createAdmin(name, email, hashedPassword)

    try {
      await sendAdminCredentials(email, name, password)
    } catch (mailErr) {
      console.error('Failed to send email:', mailErr.message)
    }

    res.status(201).json(newAdmin)
  } catch (err) {
    console.error('Error creating admin:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const deleted = await adminQueries.deleteAdmin(req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Admin not found' })
    }
    res.json({ success: true, message: 'Admin deleted successfully' })
  } catch (err) {
    console.error('Error deleting admin:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
