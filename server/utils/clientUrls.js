const DEFAULT_CLIENT_URL = 'http://localhost:5173'
const PRODUCTION_CLIENT_URL = 'https://ims.osamarahmani.tech'

const normalizeOrigin = value => {
  try {
    return new URL(String(value || '').trim()).origin
  } catch {
    return null
  }
}

const splitUrls = value => String(value || '')
  .split(/[,\s;]+/)
  .map(normalizeOrigin)
  .filter(Boolean)

const getAllowedClientOrigins = () => {
  const configuredOrigins = [
    ...splitUrls(process.env.CLIENT_URL),
    ...splitUrls(process.env.CORS_ORIGINS)
  ]

  return [...new Set([
    DEFAULT_CLIENT_URL,
    PRODUCTION_CLIENT_URL,
    ...configuredOrigins
  ].map(normalizeOrigin).filter(Boolean))]
}

const getPrimaryClientUrl = () => (
  splitUrls(process.env.CLIENT_URL)[0] ||
  splitUrls(process.env.CORS_ORIGINS)[0] ||
  (process.env.NODE_ENV === 'production' ? PRODUCTION_CLIENT_URL : DEFAULT_CLIENT_URL)
)

module.exports = {
  getAllowedClientOrigins,
  getPrimaryClientUrl,
  normalizeOrigin
}
