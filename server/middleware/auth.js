const jwt = require('jsonwebtoken')
const pool = require('../db/pool')

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token provided' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' })
  }
}

const verifyAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

const verifySuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' })
  }
  next()
}

const verifyTeammateAccess = async (req, res, next) => {
  if (req.user.role !== 'intern') {
    return next()
  }
  const viewerInternId = req.user.intern_id
  const targetInternId = req.params.internId || req.params.id

  if (viewerInternId === targetInternId) {
    return next()
  }

  try {
    // Get viewer's batch
    const viewerRes = await pool.query('SELECT batch_number FROM interns WHERE id = $1', [viewerInternId])
    if (viewerRes.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied: viewer profile not found' })
    }
    const viewerBatch = viewerRes.rows[0].batch_number

    // Get target details and batch visibility
    const targetRes = await pool.query(
      `SELECT i.batch_number, i.profile_visible, b.visibility_mode 
       FROM interns i 
       LEFT JOIN batches b ON i.batch_number = b.batch_number 
       WHERE i.id = $1`, 
      [targetInternId]
    )
    if (targetRes.rows.length === 0) {
      return res.status(404).json({ error: 'Target intern not found' })
    }
    
    const { batch_number: targetBatch, profile_visible, visibility_mode } = targetRes.rows[0]
    
    // Must be in same batch
    if (viewerBatch !== targetBatch) {
      return res.status(403).json({ error: 'Access denied: not in the same batch' })
    }
    
    // Check visibility rules
    const visMode = visibility_mode || 'intern_choice'
    if (visMode === 'public') {
      return next()
    }
    if (visMode === 'intern_choice' && profile_visible === true) {
      return next()
    }
    
    return res.status(403).json({ error: 'Access denied: profile is private' })
  } catch (err) {
    console.error('Error verifying teammate access:', err.message)
    return res.status(500).json({ error: 'Internal server error during access verification' })
  }
}

module.exports = { verifyToken, verifyAdmin, verifySuperAdmin, verifyTeammateAccess }

