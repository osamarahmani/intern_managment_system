const pool = require('../pool')

const getAllInterns = async () => {
  const result = await pool.query(
    'SELECT id, name, college_name, dept, year, sem, mail, number, starting_date, ending_date, batch_number, status, profile_visible, created_at, is_archived, archived_at FROM interns WHERE is_archived = false OR is_archived IS NULL ORDER BY created_at DESC'
  )
  return result.rows
}

const getInternById = async (id) => {
  const result = await pool.query(
    'SELECT id, name, college_name, dept, year, sem, mail, number, starting_date, ending_date, batch_number, status, profile_visible, created_at, is_archived, archived_at FROM interns WHERE id = $1',
    [id]
  )
  return result.rows[0]
}

const getInternsByBatch = async (batchNumber, status = 'approved') => {
  const result = await pool.query(
    'SELECT id, name, college_name, dept, year, sem, mail, number, starting_date, ending_date, batch_number, status, profile_visible, created_at, is_archived, archived_at FROM interns WHERE batch_number = $1 AND status = $2 AND (is_archived = false OR is_archived IS NULL) ORDER BY created_at DESC',
    [batchNumber, status]
  )
  return result.rows
}

const getInternPhoto = async (id) => {
  const result = await pool.query(
    'SELECT photo, photo_mime_type FROM interns WHERE id = $1',
    [id]
  )
  return result.rows[0]
}

const createIntern = async (data) => {
  const {
    name, college_name, dept, year, sem, mail, number,
    starting_date, ending_date, batch_number, photo, photo_mime_type
  } = data

  const result = await pool.query(
    `INSERT INTO interns
     (name, college_name, dept, year, sem, mail, number,
      starting_date, ending_date, batch_number, photo, photo_mime_type, status, is_archived)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending',false)
     RETURNING id`,
    [
      name, college_name, dept, year, sem, mail, number,
      starting_date, ending_date, batch_number, photo, photo_mime_type
    ]
  )
  return result.rows[0].id
}

const updateIntern = async (id, data) => {
  const {
    name, college_name, dept, year, sem, mail, number,
    starting_date, ending_date, batch_number, status, profile_visible
  } = data

  const result = await pool.query(
    `UPDATE interns SET name=$1, college_name=$2, dept=$3, year=$4, sem=$5,
     mail=$6, number=$7, starting_date=$8, ending_date=$9,
     batch_number=$10, status=$11, profile_visible=$12 WHERE id=$13 RETURNING *`,
    [
      name, college_name, dept, year, sem, mail, number,
      starting_date, ending_date, batch_number, status, profile_visible,
      id
    ]
  )
  return result.rows[0]
}

const updateInternPhoto = async (id, photoBuffer, mimeType) => {
  const result = await pool.query(
    'UPDATE interns SET photo = $1, photo_mime_type = $2 WHERE id = $3 RETURNING *',
    [photoBuffer, mimeType, id]
  )
  return result.rows[0]
}

const updateInternStatus = async (id, status) => {
  const result = await pool.query(
    'UPDATE interns SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  )
  return result.rows[0]
}

const deleteIntern = async (id) => {
  const result = await pool.query('DELETE FROM interns WHERE id = $1 RETURNING *', [id])
  return result.rows[0]
}

const archiveIntern = async (internId) => {
  const result = await pool.query(
    `UPDATE interns SET is_archived = true, archived_at = NOW(), status = 'pending' WHERE id = $1 RETURNING *`,
    [internId]
  )
  return result.rows[0]
}

const restoreIntern = async (internId) => {
  const result = await pool.query(
    `UPDATE interns SET is_archived = false, archived_at = null, status = 'approved' WHERE id = $1 RETURNING *`,
    [internId]
  )
  const intern = result.rows[0]

  if (intern) {
    const email = intern.mail
    let authUserResult = await pool.query('SELECT id FROM auth.users WHERE email = $1', [email])
    let userId
    if (authUserResult.rows.length === 0) {
      const newId = require('crypto').randomUUID()
      await pool.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [newId, email])
      userId = newId
    } else {
      userId = authUserResult.rows[0].id
    }

    const profileResult = await pool.query('SELECT id FROM profiles WHERE intern_id = $1', [internId])
    if (profileResult.rows.length === 0) {
      await pool.query(
        `INSERT INTO profiles (id, role, intern_id, name, email, password)
         VALUES ($1, 'intern', $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET intern_id = $2, role = 'intern'`,
        [userId, internId, intern.name, email, '']
      )
    }
  }

  return intern
}

const getArchivedInterns = async () => {
  const result = await pool.query(
    'SELECT id, name, college_name, dept, year, sem, mail, number, starting_date, ending_date, batch_number, status, profile_visible, created_at, is_archived, archived_at FROM interns WHERE is_archived = true ORDER BY archived_at DESC'
  )
  return result.rows
}

const getInternByEmail = async (email) => {
  const result = await pool.query(
    'SELECT * FROM interns WHERE mail = $1',
    [email]
  )
  return result.rows[0]
}

const permanentDeleteIntern = async (internId) => {
  await pool.query('DELETE FROM profiles WHERE intern_id = $1', [internId])
  await pool.query('DELETE FROM users WHERE intern_id = $1', [internId])
  const result = await pool.query('DELETE FROM interns WHERE id = $1 RETURNING *', [internId])
  return result.rows[0]
}

module.exports = {
  getAllInterns,
  getInternById,
  getInternsByBatch,
  getInternPhoto,
  createIntern,
  updateIntern,
  updateInternPhoto,
  updateInternStatus,
  deleteIntern,
  archiveIntern,
  restoreIntern,
  getArchivedInterns,
  getInternByEmail,
  permanentDeleteIntern
}
