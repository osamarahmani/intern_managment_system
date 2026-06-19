const pool = require('../db/pool')

const canManageIntern = async (user, internId) => {
  if (user.role === 'super_admin') return true
  if (user.role === 'intern') return user.intern_id === internId
  if (user.role !== 'admin') return false
  const result = await pool.query(
    `SELECT 1 FROM interns i
     JOIN batches b ON b.batch_number = i.batch_number
     WHERE i.id = $1 AND b.created_by = $2`,
    [internId, user.id]
  )
  return result.rowCount > 0
}

const canManageBatch = async (user, batchId) => {
  if (user.role === 'super_admin') return true
  if (user.role !== 'admin') return false
  const result = await pool.query('SELECT 1 FROM batches WHERE id = $1 AND created_by = $2', [batchId, user.id])
  return result.rowCount > 0
}

const getTaskOwner = async taskId => {
  const result = await pool.query('SELECT intern_id FROM tasks WHERE id = $1', [taskId])
  return result.rows[0]?.intern_id || null
}

const getSubtaskOwner = async subtaskId => {
  const result = await pool.query(
    `SELECT t.intern_id, s.task_id FROM subtasks s JOIN tasks t ON t.id = s.task_id WHERE s.id = $1`,
    [subtaskId]
  )
  return result.rows[0] || null
}

const requireInternManagement = (param = 'id') => async (req, res, next) => {
  try {
    if (!await canManageIntern(req.user, req.params[param])) return res.status(403).json({ error: 'Access denied' })
    next()
  } catch (error) { next(error) }
}

const requireBatchManagement = (param = 'id') => async (req, res, next) => {
  try {
    if (!await canManageBatch(req.user, req.params[param])) return res.status(403).json({ error: 'Access denied' })
    next()
  } catch (error) { next(error) }
}

const requireTaskAccess = (param = 'taskId') => async (req, res, next) => {
  try {
    const internId = await getTaskOwner(req.params[param])
    if (!internId) return res.status(404).json({ error: 'Task not found' })
    if (!await canManageIntern(req.user, internId)) return res.status(403).json({ error: 'Access denied' })
    req.resourceInternId = internId
    next()
  } catch (error) { next(error) }
}

const requireSubtaskAccess = (param = 'subtaskId') => async (req, res, next) => {
  try {
    const owner = await getSubtaskOwner(req.params[param])
    if (!owner) return res.status(404).json({ error: 'Subtask not found' })
    if (!await canManageIntern(req.user, owner.intern_id)) return res.status(403).json({ error: 'Access denied' })
    req.resourceInternId = owner.intern_id
    req.resourceTaskId = owner.task_id
    next()
  } catch (error) { next(error) }
}

module.exports = {
  canManageIntern,
  canManageBatch,
  requireInternManagement,
  requireBatchManagement,
  requireTaskAccess,
  requireSubtaskAccess
}
