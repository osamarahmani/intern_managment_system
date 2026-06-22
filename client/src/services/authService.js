import apiClient from '../utils/apiClient'

const authStorage = sessionStorage

const persistSession = (data) => {
  authStorage.setItem('token', data.token)
  authStorage.setItem('role', data.role)
  authStorage.setItem('intern_id', data.intern_id || '')
  authStorage.setItem('user_name', data.name || '')
  authStorage.setItem('user_email', data.email || '')
  authStorage.setItem('is_super_admin_owner', data.is_super_admin_owner ? 'true' : 'false')
}

export const getToken = () => authStorage.getItem('token')
export const getRole = () => authStorage.getItem('role')
export const getInternId = () => authStorage.getItem('intern_id')
export const getUserName = () => authStorage.getItem('user_name')
export const getUserEmail = () => authStorage.getItem('user_email')
export const isSuperAdminOwner = () => authStorage.getItem('is_super_admin_owner') === 'true'

let cachedLoginResult = null;

export const loginAdmin = async (email, password) => {
  const data = await apiClient('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  persistSession(data)
  cachedLoginResult = data
  return data
}

export const loginIntern = async (email, password) => {
  const data = await apiClient('/api/auth/intern-login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  persistSession(data)
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
  persistSession(data)
  return data
}

export const logout = () => {
  const request = apiClient('/api/auth/logout', { method: 'POST' }).catch(() => {})
  authStorage.removeItem('token')
  authStorage.removeItem('role')
  authStorage.removeItem('intern_id')
  authStorage.removeItem('user_name')
  authStorage.removeItem('user_email')
  authStorage.removeItem('is_super_admin_owner')
  authStorage.removeItem('ims_admin_active_page')
  authStorage.removeItem('ims_intern_active_page')
  authStorage.removeItem('ims_super_admin_active_page')
  authStorage.removeItem('ims_admin_batch_view')
  authStorage.removeItem('ims_admin_selected_batch')
  authStorage.removeItem('ims_admin_selected_batch_id')
  authStorage.removeItem('ims_admin_intern_tab')
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  localStorage.removeItem('intern_id')
  return request
}

export const register = async (formDataToSend) => {
  return apiClient('/api/auth/register', {
    method: 'POST',
    body: formDataToSend
  })
}

export const changePassword = async (newPassword, token = getToken()) => {
  const data = await apiClient('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ newPassword })
  }, token)
  if (data.token) persistSession(data)
  return data
}
