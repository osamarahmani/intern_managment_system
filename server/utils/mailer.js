const nodemailer = require('nodemailer')

// Check if required environment variables are set
const GMAIL_USER = process.env.GMAIL_USER
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.error('❌ EMAIL CONFIG ERROR: Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variables')
  console.error('   GMAIL_USER:', GMAIL_USER ? '✓ set' : '✗ NOT SET')
  console.error('   GMAIL_APP_PASSWORD:', GMAIL_APP_PASSWORD ? '✓ set' : '✗ NOT SET')
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
  family: 4, // Force IPv4 only (disable IPv6)
  tls: {
    rejectUnauthorized: true
  },
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD
  },
  logger: true,
  debug: process.env.MAIL_DEBUG === 'true'
})

// Verify connection with detailed error logging
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ MAIL CONFIG ERROR - Could not connect to Gmail SMTP:')
    console.error('   Error:', error.message)
    if (error.code === 'EAUTH') {
      console.error('   ⚠️  Authentication failed. Check GMAIL_USER and GMAIL_APP_PASSWORD')
      console.error('   📝 Note: Use Gmail App Password, not your regular password')
    } else if (error.code === 'ETIMEDOUT' || error.code === 'EHOSTUNREACH') {
      console.error('   ⚠️  Network/connection timeout. Firewall may be blocking SMTP.')
    } else if (error.code === 'ENETUNREACH' || error.code === 'ESOCKET') {
      console.error('   ⚠️  Network unreachable on Render.')
      console.error('   💡 Render may block outbound SMTP. Consider using SendGrid/Mailgun.')
    }
    console.error('   Code:', error.code)
  } else {
    console.log('✅ MAIL SERVER READY - Connected to Gmail SMTP')
  }
})

const sendAdminCredentials = async (email, name, password) => {
  if (!GMAIL_USER) {
    throw new Error('GMAIL_USER environment variable is not set')
  }

  const htmlContent = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px; color: #333333;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
        <div style="background-color: #4f46e5; padding: 30px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Welcome to the Team!</h2>
        </div>
        <div style="padding: 40px 30px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 16px; margin-bottom: 30px; line-height: 1.5;">Your administrative account has been successfully created. Below are your temporary login credentials. For security purposes, please change your password immediately after your first login.</p>
          
          <div style="background-color: #f3f4f6; border-left: 4px solid #4f46e5; padding: 20px; border-radius: 4px; margin-bottom: 30px;">
            <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #4f46e5; text-decoration: none;">${email}</a></p>
            <p style="margin: 0; font-size: 15px;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 16px;">${password}</code></p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">If you have any issues logging in, please contact the IT support team.</p>
        </div>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Intern Management System" <${GMAIL_USER}>`,
      to: email,
      subject: 'Welcome! Your Admin Account Credentials',
      html: htmlContent
    })
    console.log(`✅ Admin credentials email sent to ${email}`, { messageId: info.messageId })
    return info
  } catch (error) {
    console.error(`❌ Failed to send admin credentials email to ${email}:`, error.message)
    throw error
  }
};

const sendPasswordReset = async (email, resetLink) => {
  if (!GMAIL_USER) {
    throw new Error('GMAIL_USER environment variable is not set')
  }

  const htmlContent = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px; color: #333333;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
        <div style="padding: 40px 30px; text-align: center;">
          <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Password Reset Request</h2>
          <p style="font-size: 16px; color: #4b5563; margin-bottom: 30px; line-height: 1.5;">
            We received a request to reset the password for the account associated with <strong>${email}</strong>. 
            Click the button below to choose a new password.
          </p>
          
          <a href="${resetLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 30px; border-radius: 6px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);">
            Reset My Password
          </a>
          
          <p style="font-size: 14px; color: #ef4444; margin-top: 30px; font-weight: 500;">
              ⏱️ This link will expire in 1 hour.
          </p>
        </div>
        <div style="background-color: #f3f4f6; padding: 20px 30px; text-align: center;">
          <p style="font-size: 13px; color: #6b7280; margin: 0;">
            If you did not request a password reset, please ignore this email or contact support if you have concerns.
          </p>
        </div>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Intern Management System" <${GMAIL_USER}>`,
      to: email,
      subject: 'Action Required: Password Reset Request',
      html: htmlContent
    })
    console.log(`✅ Password reset email sent to ${email}`, { messageId: info.messageId })
    return info
  } catch (error) {
    console.error(`❌ Failed to send password reset email to ${email}:`, error.message)
    throw error
  }
};

module.exports = { sendAdminCredentials, sendPasswordReset }