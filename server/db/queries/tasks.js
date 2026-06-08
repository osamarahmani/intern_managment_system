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
  const { intern_id, title, expected_date, upcoming_task = false } = data
  const result = await pool.query(
    `INSERT INTO tasks (intern_id, title, expected_date, upcoming_task)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [intern_id, title, expected_date, upcoming_task]
  )
  return result.rows[0]
}

const updateTask = async (id, data) => {
  const { status, submission_date, title, expected_date, upcoming_task = false } = data
  const result = await pool.query(
    `UPDATE tasks SET status=$1, submission_date=$2,
     title=$3, expected_date=$4, upcoming_task=$5 WHERE id=$6 RETURNING *`,
    [status, submission_date, title, expected_date, upcoming_task, id]
  )
  return result.rows[0]
}

const deleteTask = async (id) => {
  const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id])
  return result.rows[0]
}

module.exports = {
  getTasksByInternId,
  getTaskById,
  createTask,
  updateTask,
  deleteTask
}
