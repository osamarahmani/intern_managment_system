const express = require('express')
const cors = require('cors')
require('dotenv').config()

const authRoutes = require('./routes/auth')
const internRoutes = require('./routes/interns')
const batchRoutes = require('./routes/batches')
const projectRoutes = require('./routes/projects')
const taskRoutes = require('./routes/tasks')
const adminRoutes = require('./routes/admins')
const aiRoutes = require('./routes/ai')
const exitFeedbackRoutes = require('./routes/exitFeedback')
const { securityHeaders, rateLimit } = require('./middleware/security')
const { getSecret } = require('./utils/tokens')
const { getAllowedClientOrigins, normalizeOrigin } = require('./utils/clientUrls')
const logger = require('./utils/logger')

getSecret()

const app = express()
app.set('trust proxy', 1)

const allowedOrigins = getAllowedClientOrigins()

app.disable('x-powered-by')
app.use(securityHeaders)

const corsOptions = {
  origin: (origin, callback) => {
    const normalizedOrigin = normalizeOrigin(origin)
    const isLocalDevelopment = process.env.NODE_ENV !== 'production' && normalizedOrigin && (
      normalizedOrigin.startsWith('http://localhost:') ||
      normalizedOrigin.startsWith('http://127.0.0.1:')
    )

    if (!origin || (normalizedOrigin && allowedOrigins.includes(normalizedOrigin)) || isLocalDevelopment) {
      return callback(null, true)
    }
    logger.warn('cors', 'Blocked request origin', { origin })
    return callback(null, false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'SUCCESS'
    logger[level.toLowerCase()](req.method, `${req.originalUrl} → ${res.statusCode}`, {
      duration: `${duration}ms`,
      ip: req.ip
    })
  })
  next()
})

app.use('/api/auth', authRoutes)
app.use('/api/interns', internRoutes)
app.use('/api/batches', batchRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/admins', adminRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/exit-feedback', exitFeedbackRoutes)

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.use((req, res) => res.status(404).json({ error: 'Route not found' }))

app.use((err, req, res, next) => {
  logger.error('server', 'Unhandled request error', { error: err.message })
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Uploaded file is too large' })
  }
  res.status(500).json({ error: err.message || 'Internal server error' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))