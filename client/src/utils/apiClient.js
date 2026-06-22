export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const apiClient = async (endpoint, options = {}, token = null) => {
  const isFormData = options.body instanceof FormData
  const bearerToken = token && token !== 'session' ? token : null
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    ...options.headers
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include'
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data.error || 'Request failed'
    if ([401, 403].includes(response.status) && ['Session expired', 'Invalid token', 'No token provided'].includes(message)) {
      window.dispatchEvent(new CustomEvent('ims-auth-expired', { detail: { message } }))
    }
    throw new Error(message)
  }
  return data
}

export default apiClient
