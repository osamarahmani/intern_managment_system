const pool = require('../pool')

const getAllBatches = async () => {
  const result = await pool.query(
    `SELECT b.*, p.name AS mentor_name, p.email AS mentor_email 
     FROM batches b
     LEFT JOIN profiles p ON b.created_by = p.id
     WHERE b.is_archived = false OR b.is_archived IS NULL
     ORDER BY b.created_at DESC`
  )
  return result.rows
}

const getBatchesByAdmin = async (profileId) => {
  const result = await pool.query(
    `SELECT b.*, p.name AS mentor_name, p.email AS mentor_email
     FROM batches b
     LEFT JOIN profiles p ON b.created_by = p.id
     WHERE b.created_by = $1 AND (b.is_archived = false OR b.is_archived IS NULL)
     ORDER BY b.created_at DESC`,
    [profileId]
  )
  return result.rows
}

const getBatchByNumberAndKey = async (batchNumber, registrationKey) => {
  const result = await pool.query(
    'SELECT * FROM batches WHERE batch_number = $1 AND registration_key = $2 AND is_active = true AND (is_archived = false OR is_archived IS NULL)',
    [batchNumber, registrationKey]
  )
  return result.rows[0] || null
}

const createBatch = async (batchNumber, registrationKey, profileId) => {
  const result = await pool.query(
    'INSERT INTO batches (batch_number, registration_key, created_by) VALUES ($1, $2, $3) RETURNING *',
    [batchNumber, registrationKey, profileId]
  )
  return result.rows[0]
}

const updateBatch = async (id, data) => {
  const { is_active, visibility_mode } = data
  const result = await pool.query(
    'UPDATE batches SET is_active=$1, visibility_mode=$2 WHERE id=$3 RETURNING *',
    [is_active, visibility_mode, id]
  )
  return result.rows[0]
}

const deleteBatch = async (id) => {
  const result = await pool.query('DELETE FROM batches WHERE id = $1 RETURNING *', [id])
  return result.rows[0]
}

const archiveBatch = async (id) => {
  const result = await pool.query(
    'UPDATE batches SET is_archived = true, archived_at = NOW(), is_active = false WHERE id = $1 RETURNING *',
    [id]
  )
  return result.rows[0]
}

const restoreBatch = async (id) => {
  const result = await pool.query(
    'UPDATE batches SET is_archived = false, archived_at = null WHERE id = $1 RETURNING *',
    [id]
  )
  return result.rows[0]
}

const getArchivedBatches = async (profileId = null, includeAll = false) => {
  const params = []
  let ownerClause = ''
  if (!includeAll) {
    params.push(profileId)
    ownerClause = 'AND b.created_by = $1'
  }

  const result = await pool.query(
    `SELECT b.*, p.name AS mentor_name, p.email AS mentor_email,
      COUNT(i.id)::int AS intern_count
     FROM batches b
     LEFT JOIN profiles p ON b.created_by = p.id
     LEFT JOIN interns i ON i.batch_number = b.batch_number
     WHERE b.is_archived = true ${ownerClause}
     GROUP BY b.id, p.name, p.email
     ORDER BY b.archived_at DESC`,
    params
  )
  return result.rows
}

module.exports = {
  getAllBatches,
  getBatchesByAdmin,
  getBatchByNumberAndKey,
  createBatch,
  updateBatch,
  deleteBatch,
  archiveBatch,
  restoreBatch,
  getArchivedBatches
}
