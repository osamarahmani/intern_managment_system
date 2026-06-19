const pool = require('../pool')

const getTasksByInternId = async (internId) => {
  const result = await pool.query(
    'SELECT * FROM tasks WHERE intern_id = $1 ORDER BY created_at DESC',
    [internId]
  )
  return result.rows
}

const getTaskById = async (id) => {
  const result = await pool.query(
    'SELECT * FROM tasks WHERE id = $1',
    [id]
  )
  return result.rows[0] || null
}

const createTask = async (data) => {
  const { intern_id, title, description = '', expected_date, upcoming_task = false, deliverables = [], is_ai_generated = false } = data
  const result = await pool.query(
    `INSERT INTO tasks (intern_id, title, description, expected_date, upcoming_task, deliverables, is_ai_generated)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [intern_id, title, description, expected_date, upcoming_task, deliverables, is_ai_generated]
  )
  return result.rows[0]
}

const updateTask = async (id, data) => {
  const { status, submission_date, title, description, expected_date, upcoming_task = false } = data
  const result = await pool.query(
    `UPDATE tasks SET status=$1, submission_date=$2,
     title=$3, description=$4, expected_date=$5, upcoming_task=$6 WHERE id=$7 RETURNING *`,
    [status, submission_date, title, description ?? null, expected_date, upcoming_task, id]
  )
  return result.rows[0]
}

const deleteTask = async (id) => {
  const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id])
  return result.rows[0]
}

const saveAITaskDrafts = async (internId, tasks) => {
  const inserted = []
  for (const t of tasks) {
    const result = await pool.query(
      `INSERT INTO ai_task_drafts (intern_id, title, description, deliverables, expected_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [internId, t.title, t.description || '', t.deliverables || [], t.expected_date]
    )
    inserted.push(result.rows[0])
  }
  return inserted
}

const getAITaskDrafts = async (internId) => {
  const result = await pool.query(
    `SELECT * FROM ai_task_drafts WHERE intern_id = $1 ORDER BY expected_date ASC`,
    [internId]
  )
  return result.rows
}

const markDraftAssigned = async (draftId, taskId) => {
  const result = await pool.query(
    `UPDATE ai_task_drafts SET is_assigned = true, assigned_task_id = $1 WHERE id = $2 RETURNING *`,
    [taskId, draftId]
  )
  return result.rows[0]
}

const deleteAITaskDrafts = async (internId) => {
  await pool.query(`DELETE FROM ai_task_drafts WHERE intern_id = $1`, [internId])
}

module.exports = {
  getTasksByInternId,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  saveAITaskDrafts,
  getAITaskDrafts,
  markDraftAssigned,
  deleteAITaskDrafts
}
