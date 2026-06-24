import apiClient from '../utils/apiClient'
import { getToken } from './authService'

export const submitExitFeedback = async (payload) => {
  return apiClient('/api/exit-feedback', {
    method: 'POST',
    body: JSON.stringify(payload)
  }, getToken())
}

export const getMyExitFeedback = async () => {
  try {
    return await apiClient('/api/exit-feedback/mine', {}, getToken())
  } catch (err) {
    // If it's a 403/404 or access denied error, treat as no feedback
    if (err.message?.includes('denied') || err.message?.includes('active') || err.message?.includes('expired') || err.message?.includes('not found')) {
      return null
    }
    throw err
  }
}

export const getExitFeedbackByInternId = async (internId) => {
  try {
    return await apiClient(`/api/exit-feedback/${internId}`, {}, getToken())
  } catch (err) {
    if (err.message?.includes('denied') || err.message?.includes('not found')) {
      return null
    }
    throw err
  }
}
