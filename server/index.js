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

const app = express()

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const logger = require('./utils/logger')

app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'SUCCESS'
    logger[level.toLowerCase()](req.method, `${req.originalUrl} → ${res.statusCode}`, { duration: `${duration}ms`, ip: req.ip })
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

// Mail diagnostics endpoint (for debugging)
app.get('/api/health/mail', (req, res) => {
  const mailStatus = {
    gmail_user: process.env.GMAIL_USER ? '✓ Set' : '✗ Not set',
    gmail_password: process.env.GMAIL_APP_PASSWORD ? '✓ Set' : '✗ Not set',
    client_url: process.env.CLIENT_URL ? `✓ ${process.env.CLIENT_URL}` : '✗ Not set'
  }
  res.json({ status: 'ok', mail: mailStatus })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
