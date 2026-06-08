import apiClient from '../utils/apiClient'
import { getToken } from './authService'

export const getTasksByInternId = async (internId, token = getToken()) => {
  return apiClient(`/api/tasks/intern/${internId}`, {}, token)
}

export const assignTask = async (taskData, token = getToken()) => {
  return apiClient('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(taskData)
  }, token)
}

export const updateTask = async (taskId, taskData, token = getToken()) => {
  return apiClient(`/api/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(taskData)
  }, token)
}

export const deleteTask = async (taskId, token = getToken()) => {
  return apiClient(`/api/tasks/${taskId}`, {
    method: 'DELETE'
  }, token)
}
