const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

const sendAdminCredentials = async (email, name, password) => {
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'Your Admin Account Credentials',
    html: `<h2>Welcome ${name}</h2><p>Your admin account has been created.</p><p>Email: ${email}</p><p>Password: ${password}</p><p>Please change your password after first login.</p>`
  })
}

const sendPasswordReset = async (email, resetLink) => {
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'Password Reset Request',
    html: `<h2>Password Reset</h2><p>Click the link below to reset your password. This link expires in 1 hour.</p><a href="${resetLink}">${resetLink}</a>`
  })
}

module.exports = { sendAdminCredentials, sendPasswordReset }