const pool = require('../pool')

const getAllBatches = async () => {
  const result = await pool.query('SELECT * FROM batches ORDER BY created_at DESC')
  return result.rows
}

const getBatchByNumberAndKey = async (batchNumber, registrationKey) => {
  const result = await pool.query(
    'SELECT * FROM batches WHERE batch_number = $1 AND registration_key = $2 AND is_active = true',
    [batchNumber, registrationKey]
  )
  return result.rows[0] || null
}

const createBatch = async (data) => {
  const { batch_number, registration_key } = data
  const result = await pool.query(
    'INSERT INTO batches (batch_number, registration_key) VALUES ($1, $2) RETURNING *',
    [batch_number, registration_key]
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

module.exports = {
  getAllBatches,
  getBatchByNumberAndKey,
  createBatch,
  updateBatch,
  deleteBatch
}
