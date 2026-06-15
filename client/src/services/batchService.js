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

export const changeBatchMentor = (batchId, adminId) =>
  apiClient(`/api/batches/${batchId}`, {
    method: 'PUT',
    body: JSON.stringify({ created_by: adminId })
  }, getToken())

export const archiveBatch = async (batchId, token = getToken()) => {
  return apiClient(`/api/batches/${batchId}/archive`, {
    method: 'PATCH'
  }, token)
}

export const restoreBatch = async (batchId, token = getToken()) => {
  return apiClient(`/api/batches/${batchId}/restore`, {
    method: 'PATCH'
  }, token)
}

export const getArchivedBatches = async (token = getToken()) => {
  return apiClient('/api/batches/archived', {}, token)
}

export const permanentDeleteBatch = async (batchId, token = getToken()) => {
  return apiClient(`/api/batches/${batchId}/permanent`, {
    method: 'DELETE'
  }, token)
}
