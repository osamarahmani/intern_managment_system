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
  const db = await pool.connect()
  try {
    await db.query('BEGIN')
    await db.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [id, email])
    const result = await db.query(
      `INSERT INTO profiles (id, role, name, email, password, must_change_password)
       VALUES ($1, 'admin', $2, $3, $4, true)
       RETURNING id, name, email, created_at`,
      [id, name, email, hashedPassword]
    )
    await db.query('COMMIT')
    return result.rows[0]
  } catch (error) {
    await db.query('ROLLBACK')
    throw error
  } finally {
    db.release()
  }
}

const deleteAdmin = async (id) => {
  const db = await pool.connect()
  try {
    await db.query('BEGIN')
    const result = await db.query('DELETE FROM profiles WHERE id = $1 AND role = $2 RETURNING id', [id, 'admin'])
    if (result.rows[0]) await db.query('DELETE FROM auth.users WHERE id = $1', [id])
    await db.query('COMMIT')
    return result.rows[0]
  } catch (error) {
    await db.query('ROLLBACK')
    throw error
  } finally {
    db.release()
  }
}

const getAdminByEmail = async (email) => {
  const result = await pool.query(
    `SELECT * FROM profiles WHERE LOWER(email) = LOWER($1) AND role IN ('admin', 'super_admin')`,
    [email]
  )
  return result.rows[0]
}

module.exports = { getAllAdmins, createAdmin, deleteAdmin, getAdminByEmail }
