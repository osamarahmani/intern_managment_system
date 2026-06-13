const express = require('express')
const taskQueries = require('../db/queries/tasks')
const { verifyToken, verifyAdmin, verifyTeammateAccess } = require('../middleware/auth')
const router = express.Router()

// GET /api/tasks/intern/:internId
router.get('/intern/:internId', verifyToken, verifyTeammateAccess, async (req, res) => {
  try {
    const { internId } = req.params
    const tasks = await taskQueries.getTasksByInternId(internId)
    res.json(tasks)
  } catch (err) {

    console.error('Error fetching tasks:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/tasks — Assign task (Admin only)
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  const { intern_id, title, expected_date, upcoming_task = false } = req.body

  if (!intern_id || !title || !expected_date) {
    return res.status(400).json({ error: 'Intern ID, Title, and Expected Date are required' })
  }

  try {
    const task = await taskQueries.createTask({
      intern_id,
      title,
      expected_date,
      upcoming_task
    })
    res.json(task)
  } catch (err) {
    console.error('Error creating task:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/tasks/:id — Update task details or status (Admin or Task Owner)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const currentTask = await taskQueries.getTaskById(id)

    if (!currentTask) {
      return res.status(404).json({ error: 'Task not found' })
    }

    let merged

    if (req.user.role === 'intern') {
      // Interns can only update their own tasks
      if (currentTask.intern_id !== req.user.intern_id) {
        return res.status(403).json({ error: 'Access denied: cannot modify tasks of other interns' })
      }
      
      // Interns are only allowed to update status and submission_date
      const { status, submission_date } = req.body
      merged = {
        title: currentTask.title,
        expected_date: currentTask.expected_date,
        upcoming_task: currentTask.upcoming_task,
        status: status !== undefined ? status : currentTask.status,
        submission_date: submission_date !== undefined ? submission_date : currentTask.submission_date
      }
    } else {
      // Admin can update everything
      const { status, submission_date, title, expected_date, upcoming_task } = req.body
      merged = {
        title: title !== undefined ? title : currentTask.title,
        expected_date: expected_date !== undefined ? expected_date : currentTask.expected_date,
        upcoming_task: upcoming_task !== undefined ? upcoming_task : currentTask.upcoming_task,
        status: status !== undefined ? status : currentTask.status,
        submission_date: submission_date !== undefined ? submission_date : currentTask.submission_date
      }
    }

    const updated = await taskQueries.updateTask(id, merged)
    res.json({ success: true, task: updated })
  } catch (err) {
    console.error('Error updating task:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/tasks/:id — Delete task (Admin only)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const deleted = await taskQueries.deleteTask(req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Task not found' })
    }
    res.json({ success: true, message: 'Task deleted' })
  } catch (err) {
    console.error('Error deleting task:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
