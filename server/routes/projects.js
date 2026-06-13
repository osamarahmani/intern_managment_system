const express = require('express')
const projectQueries = require('../db/queries/projects')
const { verifyToken, verifyAdmin, verifyTeammateAccess } = require('../middleware/auth')
const router = express.Router()

// GET /api/projects/intern/:internId
router.get('/intern/:internId', verifyToken, verifyTeammateAccess, async (req, res) => {
  try {
    const { internId } = req.params
    const project = await projectQueries.getProjectByInternId(internId)
    res.json(project)
  } catch (err) {

    console.error('Error fetching project:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/projects — assign or update project details (Admin only)
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  const { intern_id, title, description, git_repo_link, live_project_link } = req.body

  if (!intern_id || !title || !description) {
    return res.status(400).json({ error: 'Intern ID, Title, and Description are required' })
  }

  try {
    const result = await projectQueries.upsertProject({
      intern_id,
      title,
      description,
      git_repo_link,
      live_project_link
    })
    res.json(result)
  } catch (err) {
    console.error('Error upserting project:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
