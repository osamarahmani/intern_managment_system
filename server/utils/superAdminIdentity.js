const normalizeEmail = email => String(email || '').trim().toLowerCase()

const getConfiguredSuperAdminEmail = () => normalizeEmail(process.env.SUPER_ADMIN_EMAIL)

const isConfiguredSuperAdminEmail = email => {
  const configured = getConfiguredSuperAdminEmail()
  return Boolean(configured) && normalizeEmail(email) === configured
}

module.exports = {
  normalizeEmail,
  getConfiguredSuperAdminEmail,
  isConfiguredSuperAdminEmail
}
