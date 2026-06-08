const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const getToken = () => localStorage.getItem('token')
export const getRole = () => localStorage.getItem('role')
export const getInternId = () => localStorage.getItem('intern_id')

export const apiFetch = async (endpoint, options = {}) => {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export { BASE_URL }
