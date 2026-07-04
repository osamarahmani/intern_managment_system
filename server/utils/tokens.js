const jwt = require('jsonwebtoken')

const getSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must be configured with at least 32 characters')
  return secret
}

const issueAccessToken = (claims, options = {}) => jwt.sign(
  claims,
  getSecret(),
  {
    algorithm: 'HS256',
    issuer: 'ims-api',
    audience: 'ims-client',
    expiresIn: options.temporary ? '15m' : (process.env.JWT_EXPIRES_IN || '8h')
  }
)

const verifyAccessToken = token => jwt.verify(token, getSecret(), {
  algorithms: ['HS256'],
  issuer: 'ims-api',
  audience: 'ims-client'
})

module.exports = { issueAccessToken, verifyAccessToken, getSecret }
