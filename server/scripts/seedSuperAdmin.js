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
        'SELECT id, role, name, email, password, must_change_password FROM profiles WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [email]
      )
      const existingProfile = existingTarget.rows[0] || null
      const id = existingProfile?.id || randomUUID()

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

      if (existingProfile) {
        const passwordMatches = existingProfile.password
          ? await bcrypt.compare(password, existingProfile.password)
          : false
        const shouldInvalidateSessions =
          existingProfile.role !== 'super_admin' ||
          existingProfile.must_change_password === true ||
          !passwordMatches

        await db.query(
          `UPDATE profiles
           SET role = 'super_admin',
               name = $2,
               email = $3,
               password = CASE WHEN $4::boolean THEN $5 ELSE password END,
               must_change_password = false,
               token_version = token_version + CASE WHEN $6::boolean THEN 1 ELSE 0 END
           WHERE id = $1`,
          [id, name, email, !passwordMatches, hashed, shouldInvalidateSessions]
        )
      } else {
        await db.query(
          `INSERT INTO profiles (id, role, name, email, password, must_change_password)
           VALUES ($1, 'super_admin', $2, $3, $4, false)`,
          [id, name, email, hashed]
        )
      }
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
