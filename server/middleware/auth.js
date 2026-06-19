const pool = require('../db/pool')
const { verifyAccessToken } = require('../utils/tokens')
const { readAuthCookie } = require('../utils/authCookie')

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = readAuthCookie(req) || (authHeader && authHeader.split(' ')[1])
  if (!token) return res.status(401).json({ error: 'No token provided' })
  try {
    const decoded = verifyAccessToken(token)

    if (decoded.role === 'intern') {
      const result = await pool.query(
        `SELECT u.token_version, u.role, i.status, i.is_archived, i.intern_status,
                i.login_blocked, i.feedback_given_at
         FROM users u JOIN interns i ON i.id = u.intern_id
         WHERE u.id = $1 AND u.intern_id = $2`,
        [decoded.id, decoded.intern_id]
      )
      const account = result.rows[0]
      if (!account || account.role !== 'intern' || account.status !== 'approved' || account.is_archived ||
          account.login_blocked || account.intern_status === 'discontinued') {
        return res.status(403).json({ error: 'Account is no longer active' })
      }
      if (account.feedback_given_at && Date.now() > new Date(account.feedback_given_at).getTime() + 7 * 86400000) {
        return res.status(403).json({ error: 'Internship access has expired' })
      }
      if ((decoded.token_version || 0) !== (account.token_version || 0)) return res.status(403).json({ error: 'Session expired' })
    } else {
      const result = await pool.query(
        'SELECT role, must_change_password, token_version FROM profiles WHERE id = $1',
        [decoded.id]
      )
      const account = result.rows[0]
      if (!account || account.role !== decoded.role) return res.status(403).json({ error: 'Account is no longer active' })
      if ((decoded.token_version || 0) !== (account.token_version || 0)) return res.status(403).json({ error: 'Session expired' })
      decoded.must_change_password = account.role === 'admin' && Boolean(account.must_change_password)
      if (decoded.must_change_password && req.originalUrl !== '/api/auth/change-password') {
        return res.status(403).json({ error: 'Password change required' })
      }
    }
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
  if (req.user.must_change_password) return res.status(403).json({ error: 'Password change required' })
  next()
}

const verifySuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' })
  }
  next()
}

const verifyTeammateAccess = async (req, res, next) => {
  const viewerInternId = req.user.intern_id
  const targetInternId = req.params.internId || req.params.id

  if (req.user.role === 'super_admin') return next()
  if (req.user.role === 'admin') {
    try {
      const result = await pool.query(
        `SELECT 1 FROM interns i JOIN batches b ON b.batch_number = i.batch_number
         WHERE i.id = $1 AND b.created_by = $2`,
        [targetInternId, req.user.id]
      )
      return result.rowCount ? next() : res.status(403).json({ error: 'Access denied' })
    } catch (err) {
      return res.status(500).json({ error: 'Unable to verify access' })
    }
  }
  if (req.user.role !== 'intern') return res.status(403).json({ error: 'Access denied' })

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
