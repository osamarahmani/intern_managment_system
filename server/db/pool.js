const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// Auto-migration on start
const runAutoMigration = async () => {
  try {
    const tableExistsRes = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'intern_exit_feedback'
      );
    `)
    const exists = tableExistsRes.rows[0].exists
    if (!exists) {
      const sqlPath = path.join(__dirname, 'migrations', 'create_intern_exit_feedback.sql')
      if (fs.existsSync(sqlPath)) {
        const sql = fs.readFileSync(sqlPath, 'utf8')
        await pool.query(sql)
        console.log('Auto-migration: intern_exit_feedback table created successfully.')
      }
    } else {
      console.log('Auto-migration: intern_exit_feedback table already exists.')
    }
  } catch (err) {
    console.error('Auto-migration failed for intern_exit_feedback:', err)
  }
}
runAutoMigration()

module.exports = pool

