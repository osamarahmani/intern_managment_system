const COOKIE_NAME = 'ims_session'

const cookieOptions = temporary => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
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
    'SameSite=Strict'
  ]
  if (options.secure) attributes.push('Secure')
  res.setHeader('Set-Cookie', attributes.join('; '))
}

const clearAuthCookie = res => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict${secure}`)
}

const readAuthCookie = req => {
  const cookies = String(req.headers.cookie || '').split(';')
  const pair = cookies.map(value => value.trim()).find(value => value.startsWith(`${COOKIE_NAME}=`))
  return pair ? decodeURIComponent(pair.slice(COOKIE_NAME.length + 1)) : null
}

module.exports = { setAuthCookie, clearAuthCookie, readAuthCookie }
