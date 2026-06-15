import apiClient from '../utils/apiClient'
import { getToken } from './authService'

export const getAllInterns = async (token = getToken()) => {
  return apiClient('/api/interns', {}, token)
}

export const getInternById = async (id, token = getToken()) => {
  return apiClient(`/api/interns/${id}`, {}, token)
}

export const getInternsByBatch = async (batchNumber, token = getToken()) => {
  return apiClient(`/api/interns/batch/${batchNumber}`, {}, token)
}

export const updateIntern = async (id, updatedFields, token = getToken()) => {
  return apiClient(`/api/interns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updatedFields)
  }, token)
}

export const approveIntern = async (id, token = getToken()) => {
  return apiClient(`/api/interns/${id}/approve`, {
    method: 'PUT'
  }, token)
}

export const rejectIntern = async (id, token = getToken()) => {
  return apiClient(`/api/interns/${id}`, {
    method: 'DELETE'
  }, token)
}

export const updateInternPhoto = async (id, photoFile, token = getToken()) => {
  const formData = new FormData()
  formData.append('photo', photoFile)
  return apiClient(`/api/interns/${id}/photo`, {
    method: 'PUT',
    body: formData
  }, token)
}

export const archiveIntern = async (id, token = getToken()) => {
  return apiClient(`/api/interns/${id}/archive`, {
    method: 'PATCH'
  }, token)
}

export const restoreIntern = async (id, token = getToken()) => {
  return apiClient(`/api/interns/${id}/restore`, {
    method: 'PATCH'
  }, token)
}

export const getArchivedInterns = async (token = getToken()) => {
  return apiClient('/api/interns/archived', {}, token)
}

export const permanentDeleteIntern = async (id, token = getToken()) => {
  return apiClient(`/api/interns/${id}/permanent`, {
    method: 'DELETE'
  }, token)
}
