import apiClient from '../utils/apiClient'
import { getToken } from './authService'

export const generateTasks = (startingDate, endingDate, projectTitle, projectDescription) =>
  apiClient('/api/ai/generate-tasks', {
    method: 'POST',
    body: JSON.stringify({ startingDate, endingDate, projectTitle, projectDescription })
  }, getToken())
