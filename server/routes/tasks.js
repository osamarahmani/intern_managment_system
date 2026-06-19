const express = require('express')
const taskQueries = require('../db/queries/tasks')
const { verifyToken, verifyAdmin } = require('../middleware/auth')
const { canManageIntern, requireInternManagement, requireTaskAccess, requireSubtaskAccess } = require('../middleware/authorization')
const pool = require('../db/pool')
const logger = require('../utils/logger')
const router = express.Router()

// GET /api/tasks/intern/:internId
router.get('/intern/:internId', verifyToken, requireInternManagement('internId'), async (req, res) => {
  const { internId } = req.params
  logger.info('tasks.getByInternId', 'Fetching tasks for intern', { internId })
  try {
    const tasks = await taskQueries.getTasksByInternId(internId)
    logger.success('tasks.getByInternId', 'Fetched tasks successfully', { internId, count: tasks.length })
    res.json(tasks)
  } catch (err) {
    logger.error('tasks.getByInternId', 'Failed to fetch tasks', { internId, error: err.message })
    res.status(500).json({ error: 'Unable to fetch tasks' })
  }
})

// POST /api/tasks — Assign task (Admin only)
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  const { intern_id, title, description = '', expected_date, upcoming_task = false } = req.body
  logger.info('tasks.create', 'Creating task', { intern_id, title })

  if (!intern_id || !title || !expected_date) {
    logger.warn('tasks.create', 'Required fields are missing', { intern_id, title })
    return res.status(400).json({ error: 'Intern ID, Title, and Expected Date are required' })
  }

  try {
    if (!await canManageIntern(req.user, intern_id)) return res.status(403).json({ error: 'Access denied' })
    if (title.length > 200 || description.length > 20000) return res.status(400).json({ error: 'Task content is too long' })
    const task = await taskQueries.createTask({
      intern_id,
      title,
      description,
      expected_date,
      upcoming_task
    })
    logger.success('tasks.create', 'Task created successfully', { task_id: task.id, intern_id })
    res.json(task)
  } catch (err) {
    logger.error('tasks.create', 'Failed to create task', { intern_id, error: err.message })
    res.status(500).json({ error: 'Unable to create task' })
  }
})

// GET /api/tasks/ai-drafts/:internId
router.get('/ai-drafts/:internId', verifyToken, verifyAdmin, requireInternManagement('internId'), async (req, res) => {
  const { internId } = req.params
  logger.info('tasks.getAIDrafts', 'Fetching AI task drafts', { internId })
  try {
    const drafts = await taskQueries.getAITaskDrafts(internId)
    logger.success('tasks.getAIDrafts', 'Fetched AI task drafts successfully', { internId, count: drafts.length })
    res.json(drafts)
  } catch (err) {
    logger.error('tasks.getAIDrafts', 'Failed to fetch AI task drafts', { internId, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/tasks/ai-drafts/:internId/assign/:draftId — assign one draft as a real task
router.post('/ai-drafts/:internId/assign/:draftId', verifyToken, verifyAdmin, requireInternManagement('internId'), async (req, res) => {
  const { internId, draftId } = req.params
  logger.info('tasks.assignAIDraft', 'Assigning AI task draft', { internId, draftId })
  try {
    const outcome = await taskQueries.assignAITaskDraft(draftId, internId)
    if (outcome.status === 'not_found') {
      logger.warn('tasks.assignAIDraft', 'Draft not found', { internId, draftId })
      return res.status(404).json({ error: 'Draft not found' })
    }
    if (outcome.status === 'assigned') {
      logger.warn('tasks.assignAIDraft', 'Draft already assigned', { internId, draftId })
      return res.status(400).json({ error: 'Already assigned' })
    }
    const task = outcome.task
    logger.success('tasks.assignAIDraft', 'AI task draft assigned successfully', { internId, draftId, task_id: task.id })
    res.json({ task })
  } catch (err) {
    logger.error('tasks.assignAIDraft', 'Failed to assign AI task draft', { internId, draftId, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/tasks/ai-drafts/:draftId — edit a draft before assigning
router.put('/ai-drafts/:draftId', verifyToken, verifyAdmin, async (req, res) => {
  const { draftId } = req.params
  const { title, description, expected_date } = req.body
  logger.info('tasks.updateAIDraft', 'Updating AI task draft', { draftId })
  try {
    const draft = await taskQueries.getAITaskDraftById(draftId)
    if (!draft) return res.status(404).json({ error: 'Draft not found' })
    if (!await canManageIntern(req.user, draft.intern_id)) return res.status(403).json({ error: 'Access denied' })
    const updated = await taskQueries.updateAITaskDraft(draftId, { title, description, expected_date })
    if (!updated) {
      logger.warn('tasks.updateAIDraft', 'Draft not found', { draftId })
      return res.status(404).json({ error: 'Draft not found' })
    }
    logger.success('tasks.updateAIDraft', 'AI task draft updated successfully', { draftId })
    res.json(updated)
  } catch (err) {
    logger.error('tasks.updateAIDraft', 'Failed to update AI task draft', { draftId, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/tasks/:id — Update task details or status (Admin or Task Owner)
router.put('/:id', verifyToken, requireTaskAccess('id'), async (req, res) => {
  const { id } = req.params
  logger.info('tasks.update', 'Updating task', { id, role: req.user.role })
  try {
    const currentTask = await taskQueries.getTaskById(id)

    if (!currentTask) {
      logger.warn('tasks.update', 'Task not found', { id })
      return res.status(404).json({ error: 'Task not found' })
    }

    let merged

    if (req.user.role === 'intern') {
      // Interns can only update their own tasks
      if (currentTask.intern_id !== req.user.intern_id) {
        logger.warn('tasks.update', 'Access denied to update task of another intern', { id, intern_id: req.user.intern_id })
        return res.status(403).json({ error: 'Access denied: cannot modify tasks of other interns' })
      }

      // Interns are only allowed to update status and submission_date
      const { status, submission_date } = req.body
      if (status !== undefined && !['not_started', 'in_progress', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid task status' })
      }
      merged = {
        title: currentTask.title,
        description: currentTask.description,
        expected_date: currentTask.expected_date,
        upcoming_task: currentTask.upcoming_task,
        status: status !== undefined ? status : currentTask.status,
        submission_date: submission_date !== undefined ? submission_date : currentTask.submission_date
      }
    } else {
      // Admin can update everything
      const { status, submission_date, title, description, expected_date, upcoming_task } = req.body
      if (status !== undefined && !['not_started', 'in_progress', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid task status' })
      }
      if ((title || '').length > 200 || (description || '').length > 20000) {
        return res.status(400).json({ error: 'Task content is too long' })
      }
      merged = {
        title: title !== undefined ? title : currentTask.title,
        description: description !== undefined ? description : currentTask.description,
        expected_date: expected_date !== undefined ? expected_date : currentTask.expected_date,
        upcoming_task: upcoming_task !== undefined ? upcoming_task : currentTask.upcoming_task,
        status: status !== undefined ? status : currentTask.status,
        submission_date: submission_date !== undefined ? submission_date : currentTask.submission_date
      }
    }

    const updated = await taskQueries.updateTask(id, merged)
    logger.success('tasks.update', 'Task updated successfully', { id })
    res.json({ success: true, task: updated })
  } catch (err) {
    logger.error('tasks.update', 'Failed to update task', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/tasks/:id — Delete task (Admin only)
router.delete('/:id', verifyToken, verifyAdmin, requireTaskAccess('id'), async (req, res) => {
  const { id } = req.params
  logger.info('tasks.delete', 'Deleting task', { id })
  try {
    const deleted = await taskQueries.deleteTask(id)
    if (!deleted) {
      logger.warn('tasks.delete', 'Task not found for deletion', { id })
      return res.status(404).json({ error: 'Task not found' })
    }
    logger.success('tasks.delete', 'Task deleted successfully', { id })
    res.json({ success: true, message: 'Task deleted' })
  } catch (err) {
    logger.error('tasks.delete', 'Failed to delete task', { id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/tasks/:taskId/subtasks
router.get('/:taskId/subtasks', verifyToken, requireTaskAccess('taskId'), async (req, res) => {
  const { taskId } = req.params
  logger.info('tasks.getSubtasks', 'Fetching subtasks for task', { taskId })
  try {
    const result = await pool.query(
      'SELECT * FROM subtasks WHERE task_id = $1 ORDER BY created_at ASC',
      [taskId]
    )
    logger.success('tasks.getSubtasks', 'Fetched subtasks successfully', { taskId, count: result.rows.length })
    res.json(result.rows)
  } catch (err) {
    logger.error('tasks.getSubtasks', 'Failed to fetch subtasks', { taskId, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/tasks/:taskId/subtasks
router.post('/:taskId/subtasks', verifyToken, verifyAdmin, requireTaskAccess('taskId'), async (req, res) => {
  const { taskId } = req.params
  const { title, description = '', expected_date } = req.body
  logger.info('tasks.createSubtask', 'Creating subtask for task', { taskId, title })
  try {
    if (!title) {
      logger.warn('tasks.createSubtask', 'Title is required', { taskId })
      return res.status(400).json({ error: 'Title is required' })
    }
    const result = await pool.query(
      `INSERT INTO subtasks (task_id, title, description, expected_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [taskId, title, description, expected_date || null]
    )
    // Reset parent task to not_started whenever a new subtask is added
    await pool.query(
      `UPDATE tasks SET status = 'not_started', submission_date = NULL WHERE id = $1`,
      [taskId]
    )
    logger.success('tasks.createSubtask', 'Subtask created successfully', { taskId, subtask_id: result.rows[0].id })
    res.json(result.rows[0])
  } catch (err) {
    logger.error('tasks.createSubtask', 'Failed to create subtask', { taskId, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/tasks/:taskId/notes
router.get('/:taskId/notes', verifyToken, requireTaskAccess('taskId'), async (req, res) => {
  const { taskId } = req.params
  logger.info('tasks.getNotes', 'Fetching notes for task', { taskId })
  try {
    const result = await pool.query(
      'SELECT * FROM task_notes WHERE task_id = $1 ORDER BY created_at ASC',
      [taskId]
    )
    logger.success('tasks.getNotes', 'Fetched notes successfully', { taskId, count: result.rows.length })
    res.json(result.rows)
  } catch (err) {
    logger.error('tasks.getNotes', 'Failed to fetch notes', { taskId, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/tasks/:taskId/notes
router.post('/:taskId/notes', verifyToken, requireTaskAccess('taskId'), async (req, res) => {
  const { taskId } = req.params
  const { note } = req.body
  logger.info('tasks.createNote', 'Saving note for task', { taskId })
  try {
    if (!note || !note.trim()) {
      logger.warn('tasks.createNote', 'Note text is required', { taskId })
      return res.status(400).json({ error: 'Note text is required' })
    }
    if (note.length > 100000) return res.status(413).json({ error: 'Note is too large' })
    const taskResult = await pool.query(
      'SELECT id, intern_id FROM tasks WHERE id = $1',
      [taskId]
    )
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const task = taskResult.rows[0]
    if (req.user.role === 'intern' && task.intern_id !== req.user.intern_id) {
      return res.status(403).json({ error: 'Access denied: cannot add notes to another intern\'s task' })
    }

    const result = await pool.query(
      `INSERT INTO task_notes (task_id, intern_id, note)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [task.id, task.intern_id, note.trim()]
    )
    logger.success('tasks.createNote', 'Note saved successfully', { taskId, note_id: result.rows[0].id })
    res.json(result.rows[0])
  } catch (err) {
    logger.error('tasks.createNote', 'Failed to save note', { taskId, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/subtasks/:subtaskId/status
router.put('/subtask/:subtaskId/status', verifyToken, requireSubtaskAccess('subtaskId'), async (req, res) => {
  const { subtaskId } = req.params
  const { status } = req.body
  logger.info('tasks.updateSubtaskStatus', 'Updating subtask status', { subtaskId, status })
  try {
    if (!['not_started', 'in_progress', 'completed'].includes(status)) {
      logger.warn('tasks.updateSubtaskStatus', 'Invalid status provided', { subtaskId, status })
      return res.status(400).json({ error: 'Invalid status' })
    }
    const db = await pool.connect()
    let result
    let allDone
    try {
      await db.query('BEGIN')
      result = await db.query('UPDATE subtasks SET status = $1 WHERE id = $2 RETURNING *', [status, subtaskId])
      if (!result.rows[0]) {
        await db.query('ROLLBACK')
        return res.status(404).json({ error: 'Subtask not found' })
      }
      const taskId = result.rows[0].task_id
      const allSubs = await db.query('SELECT status FROM subtasks WHERE task_id = $1 FOR UPDATE', [taskId])
      allDone = allSubs.rows.length > 0 && allSubs.rows.every(s => s.status === 'completed')
      if (allDone) await db.query("UPDATE tasks SET status = 'completed' WHERE id = $1", [taskId])
      else await db.query("UPDATE tasks SET status = 'in_progress' WHERE id = $1 AND status = 'completed'", [taskId])
      await db.query('COMMIT')
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    } finally {
      db.release()
    }

    logger.success('tasks.updateSubtaskStatus', 'Subtask status updated successfully', { subtaskId, status, parentAutoCompleted: allDone })
    res.json({ subtask: result.rows[0], parentAutoCompleted: allDone })
  } catch (err) {
    logger.error('tasks.updateSubtaskStatus', 'Failed to update subtask status', { subtaskId, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
