const log = (level, route, message, meta = {}) => {
  const timestamp = new Date().toISOString()
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : ''
  const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : level === 'SUCCESS' ? '✅' : 'ℹ️'
  console.log(`${prefix} [${timestamp}] [${level}] [${route}] ${message}${metaStr}`)
}

module.exports = {
  info: (route, message, meta) => log('INFO', route, message, meta),
  success: (route, message, meta) => log('SUCCESS', route, message, meta),
  warn: (route, message, meta) => log('WARN', route, message, meta),
  error: (route, message, meta) => log('ERROR', route, message, meta)
}
