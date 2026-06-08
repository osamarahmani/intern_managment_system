import apiClient from '../utils/apiClient'

export const getToken = () => localStorage.getItem('token')
export const getRole = () => localStorage.getItem('role')
export const getInternId = () => localStorage.getItem('intern_id')

export const login = async (email, password) => {
  const data = await apiClient('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  localStorage.setItem('token', data.token)
  localStorage.setItem('role', data.role)
  localStorage.setItem('intern_id', data.intern_id)
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
