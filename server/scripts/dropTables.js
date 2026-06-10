require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const pool = require('../db/pool')

const dropTables = async () => {
  try {
    console.log('Dropping database tables...')
    
    const queries = [
      'DROP TABLE IF EXISTS public.password_reset_tokens CASCADE;',
      'DROP TABLE IF EXISTS public.tasks CASCADE;',
      'DROP TABLE IF EXISTS public.projects CASCADE;',
      'DROP TABLE IF EXISTS public.profiles CASCADE;',
      'DROP TABLE IF EXISTS public.users CASCADE;',
      'DROP TABLE IF EXISTS public.interns CASCADE;',
      'DROP TABLE IF EXISTS public.batches CASCADE;',
      'DROP TABLE IF EXISTS auth.users CASCADE;'
    ]

    for (const q of queries) {
      await pool.query(q)
    }

    console.log('All tables dropped successfully!')
    process.exit(0)
  } catch (err) {
    console.error('Failed to drop tables:', err)
    process.exit(1)
  }
}

dropTables()
