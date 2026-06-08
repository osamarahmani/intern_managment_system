import apiClient from '../utils/apiClient'
import { getToken } from './authService'

export const getBatches = async (token = getToken()) => {
  return apiClient('/api/batches', {}, token)
}

export const createBatch = async (batchData, token = getToken()) => {
  return apiClient('/api/batches', {
    method: 'POST',
    body: JSON.stringify(batchData)
  }, token)
}

export const updateBatch = async (batchId, batchData, token = getToken()) => {
  return apiClient(`/api/batches/${batchId}`, {
    method: 'PUT',
    body: JSON.stringify(batchData)
  }, token)
}
