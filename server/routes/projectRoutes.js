const express = require('express')
const pool = require('../db/pool')
const { verifyToken } = require('../middleware/auth')
const router = express.Router()

router.get('/intern/:internId', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM projects WHERE intern_id = $1',
      [req.params.internId]
    )
    res.json(result.rows[0] || null)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', verifyToken, async (req, res) => {
  const { intern_id, title, description, git_repo_link, live_project_link } = req.body
  try {
    const existing = await pool.query(
      'SELECT id FROM projects WHERE intern_id = $1', [intern_id]
    )
    let result
    if (existing.rows[0]) {
      result = await pool.query(
        `UPDATE projects SET title=$1, description=$2,
         git_repo_link=$3, live_project_link=$4 WHERE intern_id=$5 RETURNING *`,
        [title, description, git_repo_link, live_project_link, intern_id]
      )
    } else {
      result = await pool.query(
        `INSERT INTO projects (intern_id, title, description, git_repo_link, live_project_link)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [intern_id, title, description, git_repo_link, live_project_link]
      )
    }
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
