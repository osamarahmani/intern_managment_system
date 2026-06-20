import apiClient from '../utils/apiClient'
import { getToken } from './authService'

export const submitExitFeedback = async (formData, token = getToken()) => {
  return apiClient('/api/exit-feedback', {
    method: 'POST',
    body: JSON.stringify(formData)
  }, token)
}

export const getMyExitFeedback = async (token = getToken()) => {
  return apiClient('/api/exit-feedback/mine', {}, token)
}

export const getAllExitFeedback = async (token = getToken()) => {
  return apiClient('/api/exit-feedback', {}, token)
}
