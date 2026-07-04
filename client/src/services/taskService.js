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

export const updateTaskStatus = async (taskId, status) => {
  return await apiClient(`/api/tasks/${taskId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  })
}

export const getSubTasksByTaskId = async (taskId, token = getToken()) => {
  return apiClient(`/api/tasks/${taskId}/subtasks`, {}, token)
}

export const createSubTask = async (taskId, subtaskData, token = getToken()) => {
  return apiClient(`/api/tasks/${taskId}/subtasks`, {
    method: 'POST',
    body: JSON.stringify(subtaskData)
  }, token)
}

export const updateSubTaskStatus = async (subtaskId, status, token = getToken()) => {
  return apiClient(`/api/tasks/subtask/${subtaskId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  }, token)
}

export const getTaskNotes = async (taskId, token = getToken()) => {
  return apiClient(`/api/tasks/${taskId}/notes`, {}, token)
}

export const saveTaskNote = async (taskId, noteData, token = getToken()) => {
  return apiClient(`/api/tasks/${taskId}/notes`, {
    method: 'POST',
    body: JSON.stringify(noteData)
  }, token)
}

export const getAITaskDrafts = async (internId, token = getToken()) => {
  return await apiClient(`/api/tasks/ai-drafts/${internId}`, { method: 'GET' }, token)
}

export const assignAITaskDraft = async (internId, draftId, token = getToken()) => {
  return await apiClient(`/api/tasks/ai-drafts/${internId}/assign/${draftId}`, { method: 'POST' }, token)
}

export const updateAITaskDraft = async (draftId, draftData, token = getToken()) => {
  return apiClient(`/api/tasks/ai-drafts/${draftId}`, {
    method: 'PUT',
    body: JSON.stringify(draftData)
  }, token)
}

