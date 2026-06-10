require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const bcrypt = require('bcryptjs')
const pool = require('../db/pool')

const seedSuperAdmin = async () => {
  try {
    const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@company.com'
    const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123'
    const name = process.env.SUPER_ADMIN_NAME || 'Super Admin'

    const existing = await pool.query(
      `SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1`
    )
    if (existing.rows.length > 0) {
      console.log('Super admin already exists')
      process.exit(0)
    }

    const id = require('crypto').randomUUID()
    const hashed = await bcrypt.hash(password, 12)

    // Insert into auth.users first to satisfy foreign key constraint
    await pool.query(
      'INSERT INTO auth.users (id, email) VALUES ($1, $2)',
      [id, email]
    )

    await pool.query(
      `INSERT INTO profiles (id, role, name, email, password)
       VALUES ($1, 'super_admin', $2, $3, $4)`,
      [id, name, email, hashed]
    )
    console.log('Super admin created:', email)
    process.exit(0)
  } catch (err) {
    console.error('Failed to seed super admin:', err)
    process.exit(1)
  }
}

seedSuperAdmin()
