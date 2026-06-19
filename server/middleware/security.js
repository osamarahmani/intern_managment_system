const buckets = new Map()

const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'")
  if (req.originalUrl.startsWith('/api/auth')) res.setHeader('Cache-Control', 'no-store')
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  next()
}

const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 100, name = 'api', keyGenerator } = {}) => (req, res, next) => {
  const now = Date.now()
  if (buckets.size > 10000) {
    for (const [storedKey, storedBucket] of buckets) if (storedBucket.resetAt <= now) buckets.delete(storedKey)
  }
  const discriminator = keyGenerator ? keyGenerator(req) : req.ip
  const key = `${name}:${String(discriminator).slice(0, 500)}`
  if (buckets.size >= 20000 && !buckets.has(key)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' })
  }
  let bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) bucket = { count: 0, resetAt: now + windowMs }
  bucket.count += 1
  buckets.set(key, bucket)

  res.setHeader('RateLimit-Limit', String(max))
  res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)))
  res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)))
  if (bucket.count > max) {
    res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)))
    return res.status(429).json({ error: 'Too many requests. Please try again later.' })
  }
  next()
}

const isValidImage = file => {
  if (!file?.buffer || file.buffer.length < 12) return false
  const b = file.buffer
  if (file.mimetype === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  if (file.mimetype === 'image/png') return b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (file.mimetype === 'image/webp') return b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'
  return false
}

module.exports = { securityHeaders, rateLimit, isValidImage }
