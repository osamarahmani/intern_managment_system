import apiClient from '../utils/apiClient'
import { getToken } from './authService'

export const getAllAdmins = () =>
  apiClient('/api/admins', { method: 'GET' }, getToken())

export const createAdmin = (name, email) =>
  apiClient('/api/admins', {
    method: 'POST',
    body: JSON.stringify({ name, email })
  }, getToken())

export const deleteAdmin = (id) =>
  apiClient(`/api/admins/${id}`, { method: 'DELETE' }, getToken())
