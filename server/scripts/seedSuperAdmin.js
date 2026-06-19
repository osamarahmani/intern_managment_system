require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const bcrypt = require('bcryptjs')
const pool = require('../db/pool')

const seedSuperAdmin = async () => {
  try {
    const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()
    const password = process.env.SUPER_ADMIN_PASSWORD
    const name = process.env.SUPER_ADMIN_NAME?.trim()
    if (!email || !name || !password || password.length < 12) {
      throw new Error('SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME, and a 12+ character SUPER_ADMIN_PASSWORD are required')
    }

    const existing = await pool.query(
      `SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1`
    )
    if (existing.rows.length > 0) {
      console.log('Super admin already exists')
      process.exit(0)
    }

    const id = require('crypto').randomUUID()
    const hashed = await bcrypt.hash(password, 12)

    const db = await pool.connect()
    try {
      await db.query('BEGIN')
      await db.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [id, email])
      await db.query(
        `INSERT INTO profiles (id, role, name, email, password, must_change_password)
         VALUES ($1, 'super_admin', $2, $3, $4, false)`,
        [id, name, email, hashed]
      )
      await db.query('COMMIT')
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    } finally {
      db.release()
    }
    console.log('Super admin created:', email)
    process.exit(0)
  } catch (err) {
    console.error('Failed to seed super admin:', err)
    process.exit(1)
  }
}

seedSuperAdmin()
