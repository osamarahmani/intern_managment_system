const pool = require('../pool')

const getAllInterns = async () => {
  const result = await pool.query(
    'SELECT id, name, college_name, dept, year, sem, mail, number, starting_date, ending_date, batch_id, batch_number, status, profile_visible, created_at, is_archived, archived_at, intern_status, discontinued_reason, login_blocked, feedback_given_at FROM interns WHERE is_archived = false OR is_archived IS NULL ORDER BY created_at DESC'
  )
  return result.rows
}

const getInternsByAdmin = async (adminId, archived = false) => {
  const result = await pool.query(
    `SELECT i.id, i.name, i.college_name, i.dept, i.year, i.sem, i.mail, i.number,
            i.starting_date, i.ending_date, i.batch_id, i.batch_number, i.status, i.profile_visible,
            i.created_at, i.is_archived, i.archived_at, i.intern_status,
            i.discontinued_reason, i.login_blocked, i.feedback_given_at
     FROM interns i JOIN batches b ON b.id = i.batch_id
     WHERE b.created_by = $1 AND COALESCE(i.is_archived, false) = $2
     ORDER BY i.created_at DESC`,
    [adminId, archived]
  )
  return result.rows
}

const getInternById = async (id) => {
  const result = await pool.query(
    'SELECT id, name, college_name, dept, year, sem, mail, number, starting_date, ending_date, batch_id, batch_number, status, profile_visible, created_at, is_archived, archived_at, intern_status, discontinued_reason, login_blocked, feedback_given_at FROM interns WHERE id = $1',
    [id]
  )
  return result.rows[0]
}

const getInternsByBatch = async (batchNumber, status = 'approved') => {
  const result = await pool.query(
    'SELECT id, name, college_name, dept, year, sem, mail, number, starting_date, ending_date, batch_id, batch_number, status, profile_visible, created_at, is_archived, archived_at, intern_status, discontinued_reason, login_blocked, feedback_given_at FROM interns WHERE batch_number = $1 AND status = $2 AND (is_archived = false OR is_archived IS NULL) ORDER BY created_at DESC',
    [batchNumber, status]
  )
  return result.rows
}

const getInternsByBatchId = async (batchId, status = 'approved') => {
  const result = await pool.query(
    'SELECT id, name, college_name, dept, year, sem, mail, number, starting_date, ending_date, batch_id, batch_number, status, profile_visible, created_at, is_archived, archived_at, intern_status, discontinued_reason, login_blocked, feedback_given_at FROM interns WHERE batch_id = $1 AND status = $2 AND (is_archived = false OR is_archived IS NULL) ORDER BY created_at DESC',
    [batchId, status]
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

const createIntern = async (data, db = pool) => {
  const {
    name, college_name, dept, year, sem, mail, number,
    starting_date, ending_date, batch_id, batch_number, photo, photo_mime_type
  } = data

  const result = await db.query(
    `INSERT INTO interns
     (name, college_name, dept, year, sem, mail, number,
      starting_date, ending_date, batch_id, batch_number, photo, photo_mime_type, status, is_archived)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending',false)
     RETURNING id`,
    [
      name, college_name, dept, year, sem, mail, number,
      starting_date, ending_date, batch_id, batch_number, photo, photo_mime_type
    ]
  )
  return result.rows[0].id
}

const updateIntern = async (id, data) => {
  const {
    name, college_name, dept, year, sem, mail, number,
    starting_date, ending_date, batch_id, batch_number, status, profile_visible
  } = data

  const db = await pool.connect()
  try {
    await db.query('BEGIN')
    const result = await db.query(
      `UPDATE interns SET name=$1, college_name=$2, dept=$3, year=$4, sem=$5,
       mail=$6, number=$7, starting_date=$8, ending_date=$9,
       batch_id=$10, batch_number=$11, status=$12, profile_visible=$13 WHERE id=$14 RETURNING *`,
      [name, college_name, dept, year, sem, String(mail).trim().toLowerCase(), number,
        starting_date, ending_date, batch_id, batch_number, status, profile_visible, id]
    )
    if (result.rows[0]) {
      await db.query(
        'UPDATE users SET email = $1, token_version = token_version + CASE WHEN email IS DISTINCT FROM $1 THEN 1 ELSE 0 END WHERE intern_id = $2',
        [String(mail).trim().toLowerCase(), id]
      )
    }
    await db.query('COMMIT')
    return result.rows[0]
  } catch (error) {
    await db.query('ROLLBACK')
    throw error
  } finally {
    db.release()
  }
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
  return result.rows[0]
}

const getArchivedInterns = async () => {
  const result = await pool.query(
    'SELECT id, name, college_name, dept, year, sem, mail, number, starting_date, ending_date, batch_id, batch_number, status, profile_visible, created_at, is_archived, archived_at, intern_status, discontinued_reason, login_blocked, feedback_given_at FROM interns WHERE is_archived = true ORDER BY archived_at DESC'
  )
  return result.rows
}

const getInternByEmail = async (email) => {
  const result = await pool.query(
    'SELECT * FROM interns WHERE LOWER(mail) = LOWER($1)',
    [email]
  )
  return result.rows[0]
}

const permanentDeleteIntern = async (internId) => {
  const db = await pool.connect()
  try {
    await db.query('BEGIN')
    await db.query('DELETE FROM profiles WHERE intern_id = $1', [internId])
    await db.query('DELETE FROM users WHERE intern_id = $1', [internId])
    const result = await db.query('DELETE FROM interns WHERE id = $1 RETURNING *', [internId])
    await db.query('COMMIT')
    return result.rows[0]
  } catch (error) {
    await db.query('ROLLBACK')
    throw error
  } finally {
    db.release()
  }
}

module.exports = {
  getAllInterns,
  getInternsByAdmin,
  getInternById,
  getInternsByBatch,
  getInternsByBatchId,
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
