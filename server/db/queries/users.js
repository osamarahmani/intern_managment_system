const pool = require('../pool')

const getUserByEmail = async (email) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  )
  return result.rows[0] || null
}

const createUser = async (data, db = pool) => {
  const { email, password_hash, role, intern_id } = data
  const result = await db.query(
    'INSERT INTO users (email, password_hash, role, intern_id) VALUES ($1,$2,$3,$4) RETURNING *',
    [email, password_hash, role, intern_id]
  )
  return result.rows[0]
}

module.exports = {
  getUserByEmail,
  createUser
}
