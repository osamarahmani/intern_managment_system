require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const bcrypt = require('bcryptjs')
const pool = require('../db/pool')
const { randomUUID } = require('crypto')
const { getConfiguredSuperAdminEmail } = require('../utils/superAdminIdentity')

const seedSuperAdmin = async () => {
  try {
    const email = getConfiguredSuperAdminEmail()
    const password = process.env.SUPER_ADMIN_PASSWORD
    const name = process.env.SUPER_ADMIN_NAME?.trim() || 'Super Admin'
    if (!email || !name || !password || password.length < 12) {
      throw new Error('SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME, and a 12+ character SUPER_ADMIN_PASSWORD are required')
    }

    const hashed = await bcrypt.hash(password, 12)

    const db = await pool.connect()
    try {
      await db.query('BEGIN')

      const existingTarget = await db.query(
        'SELECT id FROM profiles WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [email]
      )
      const id = existingTarget.rows[0]?.id || randomUUID()

      await db.query(
        `INSERT INTO auth.users (id, email)
         VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
        [id, email]
      )

      await db.query(
        `UPDATE profiles
         SET role = 'admin',
             must_change_password = true,
             token_version = token_version + 1
         WHERE role = 'super_admin' AND LOWER(email) <> LOWER($1)`,
        [email]
      )

      await db.query(
        `INSERT INTO profiles (id, role, name, email, password, must_change_password)
         VALUES ($1, 'super_admin', $2, $3, $4, false)
         ON CONFLICT (id) DO UPDATE SET
           role = 'super_admin',
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           password = EXCLUDED.password,
           must_change_password = false,
           token_version = profiles.token_version + 1`,
        [id, name, email, hashed]
      )
      await db.query('COMMIT')
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    } finally {
      db.release()
    }
    console.log('Canonical super admin ensured:', email)
    process.exit(0)
  } catch (err) {
    console.error('Failed to seed super admin:', err)
    process.exit(1)
  }
}

seedSuperAdmin()
