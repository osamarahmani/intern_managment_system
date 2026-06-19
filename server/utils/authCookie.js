const COOKIE_NAME = 'ims_session'

const getSameSite = () => {
  if (process.env.COOKIE_SAMESITE) return process.env.COOKIE_SAMESITE
  return process.env.NODE_ENV === 'production' ? 'None' : 'Lax'
}

const cookieOptions = temporary => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || getSameSite().toLowerCase() === 'none',
  sameSite: getSameSite(),
  path: '/',
  maxAge: temporary ? 15 * 60 * 1000 : 8 * 60 * 60 * 1000
})

const setAuthCookie = (res, token, temporary = false) => {
  const options = cookieOptions(temporary)
  const attributes = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Max-Age=${Math.floor(options.maxAge / 1000)}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${options.sameSite}`
  ]
  if (options.secure) attributes.push('Secure')
  res.setHeader('Set-Cookie', attributes.join('; '))
}

const clearAuthCookie = res => {
  const options = cookieOptions(false)
  const secure = options.secure ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=${options.sameSite}${secure}`)
}

const readAuthCookie = req => {
  const cookies = String(req.headers.cookie || '').split(';')
  const pair = cookies.map(value => value.trim()).find(value => value.startsWith(`${COOKIE_NAME}=`))
  return pair ? decodeURIComponent(pair.slice(COOKIE_NAME.length + 1)) : null
}

module.exports = { setAuthCookie, clearAuthCookie, readAuthCookie }
