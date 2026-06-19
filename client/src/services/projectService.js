import apiClient from '../utils/apiClient'
import { getToken } from './authService'

export const getProjectByInternId = async (internId, token = getToken()) => {
  return apiClient(`/api/projects/intern/${internId}`, {}, token)
}

export const assignProject = async (projectData, token = getToken()) => {
  return apiClient('/api/projects', {
    method: 'POST',
    body: JSON.stringify(projectData)
  }, token)
}

export const generateAITasks = async (projectTitle, projectDescription, startingDate, endingDate, internId, token = getToken()) => {
  return apiClient('/api/ai/generate-tasks', {
    method: 'POST',
    body: JSON.stringify({
      startingDate,
      endingDate,
      projectTitle,
      projectDescription,
      intern_id: internId
    })
  }, token)
}
