const express = require('express')
const projectQueries = require('../db/queries/projects')
const { verifyToken, verifyAdmin, verifyTeammateAccess } = require('../middleware/auth')
const { canManageIntern } = require('../middleware/authorization')
const logger = require('../utils/logger')
const router = express.Router()

// GET /api/projects/intern/:internId
router.get('/intern/:internId', verifyToken, verifyTeammateAccess, async (req, res) => {
  const { internId } = req.params
  logger.info('projects.getByInternId', 'Fetching project for intern', { internId })
  try {
    const project = await projectQueries.getProjectByInternId(internId)
    logger.success('projects.getByInternId', 'Fetched project successfully', { internId, hasProject: !!project })
    res.json(project)
  } catch (err) {
    logger.error('projects.getByInternId', 'Failed to fetch project', { internId, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/projects — assign or update project details (Admin only)
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  const { intern_id, title, description, git_repo_link, live_project_link } = req.body
  logger.info('projects.upsert', 'Upserting project for intern', { intern_id, title })

  if (!intern_id || !title || !description) {
    logger.warn('projects.upsert', 'Required fields are missing', { intern_id, title })
    return res.status(400).json({ error: 'Intern ID, Title, and Description are required' })
  }

  try {
    if (!await canManageIntern(req.user, intern_id)) return res.status(403).json({ error: 'Access denied' })
    const validUrl = value => !value || (() => {
      try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false }
    })()
    if (!validUrl(git_repo_link) || !validUrl(live_project_link)) return res.status(400).json({ error: 'Project links must use HTTP or HTTPS' })
    if (title.length > 200 || description.length > 20000) return res.status(400).json({ error: 'Project content is too long' })
    const result = await projectQueries.upsertProject({
      intern_id,
      title,
      description,
      git_repo_link,
      live_project_link
    })
    logger.success('projects.upsert', 'Project upserted successfully', { intern_id, title })
    res.json(result)
  } catch (err) {
    logger.error('projects.upsert', 'Failed to upsert project', { intern_id, error: err.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
