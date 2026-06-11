import apiClient from '../utils/apiClient'

export const getToken = () => localStorage.getItem('token')
export const getRole = () => localStorage.getItem('role')
export const getInternId = () => localStorage.getItem('intern_id')

let cachedLoginResult = null;

export const loginAdmin = async (email, password) => {
  const data = await apiClient('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  localStorage.setItem('token', data.token)
  localStorage.setItem('role', data.role)
  localStorage.setItem('intern_id', data.intern_id || '')
  cachedLoginResult = data
  return data
}

export const loginIntern = async (email, password) => {
  const data = await apiClient('/api/auth/intern-login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  localStorage.setItem('token', data.token)
  localStorage.setItem('role', data.role)
  localStorage.setItem('intern_id', data.intern_id || '')
  cachedLoginResult = data
  return data
}

export const login = async (email, password) => {
  if (cachedLoginResult) {
    const data = cachedLoginResult
    cachedLoginResult = null
    return data
  }
  const data = await apiClient('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  localStorage.setItem('token', data.token)
  localStorage.setItem('role', data.role)
  localStorage.setItem('intern_id', data.intern_id || '')
  return data
}

export const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  localStorage.removeItem('intern_id')
}

export const register = async (formDataToSend) => {
  return apiClient('/api/auth/register', {
    method: 'POST',
    body: formDataToSend
  })
}

export const changePassword = async (newPassword, token = getToken()) => {
  return apiClient('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ newPassword })
  }, token)
}
