const pool = require('../pool')

const getAllAdmins = async () => {
  const result = await pool.query(
    `SELECT p.id, p.name, p.email, p.created_at 
     FROM profiles p 
     WHERE p.role = 'admin' 
     ORDER BY p.created_at DESC`
  )
  return result.rows
}

const createAdmin = async (name, email, hashedPassword) => {
  const { randomUUID } = require('crypto')
  const id = randomUUID()
  // Insert into auth.users first to satisfy the profiles table foreign key constraint
  await pool.query(
    'INSERT INTO auth.users (id, email) VALUES ($1, $2)',
    [id, email]
  )
  const result = await pool.query(
    `INSERT INTO profiles (id, role, name, email, password, must_change_password)
     VALUES ($1, 'admin', $2, $3, $4, true)
     RETURNING id, name, email, created_at`,
    [id, name, email, hashedPassword]
  )
  return result.rows[0]
}

const deleteAdmin = async (id) => {
  const result = await pool.query(
    'DELETE FROM profiles WHERE id = $1 AND role = $2 RETURNING id',
    [id, 'admin']
  )
  if (result.rows[0]) {
    await pool.query('DELETE FROM auth.users WHERE id = $1', [id])
  }
  return result.rows[0]
}

const getAdminByEmail = async (email) => {
  const result = await pool.query(
    `SELECT * FROM profiles WHERE email = $1 AND role IN ('admin', 'super_admin')`,
    [email]
  )
  return result.rows[0]
}

module.exports = { getAllAdmins, createAdmin, deleteAdmin, getAdminByEmail }
