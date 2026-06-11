# Gmail SMTP Configuration Guide

This project uses Gmail SMTP to send emails for:
- Admin account credentials (when a new admin is created)
- Password reset links (for admins and interns)

---

## Step 1: Enable 2-Step Verification on your Google Account

1. Go to [https://myaccount.google.com](https://myaccount.google.com)
2. Click **Security** in the left sidebar
3. Under "How you sign in to Google", click **2-Step Verification**
4. Follow the steps to enable it

> 2-Step Verification must be enabled before you can create an App Password.

---

## Step 2: Generate a Gmail App Password

1. Go to [https://myaccount.google.com](https://myaccount.google.com)
2. In the **search bar at the top** of the page, type `App Passwords`
3. Click the **App Passwords** result that appears
4. Sign in again if prompted
5. Under "App name", type a name like `Intern Management System`
6. Click **Create**
7. Google will show you a **16-character password** like: `xxxx xxxx xxxx xxxx`
8. **Copy this password immediately** — it will not be shown again
9. Remove the spaces when pasting into `.env` — it should be 16 characters with no spaces: `xxxxxxxxxxxxxxxx`

> If you cannot find App Passwords in the search bar, make sure 2-Step Verification is fully enabled first.

> This App Password is different from your Gmail login password. Never share it.

---

## Step 3: Add to server/.env

Open `server/.env` and fill in:

```env
GMAIL_USER=your_gmail_address@gmail.com
GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
```

Example:
```env
GMAIL_USER=internapp@gmail.com
GMAIL_APP_PASSWORD=abcdabcdabcdabcd
```

---

## Step 4: Verify SMTP Settings

The mailer is configured in `server/utils/mailer.js` using:
Host:     smtp.gmail.com
Port:     465
Secure:   true (SSL)

These settings are already configured. You only need to provide `GMAIL_USER` and `GMAIL_APP_PASSWORD` in `.env`.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Invalid login` error | Make sure 2-Step Verification is enabled and App Password is correct |
| `Username and Password not accepted` | You may be using your Gmail login password instead of the App Password |
| App Passwords not appearing in search | Enable 2-Step Verification first, then search again |
| Emails not arriving | Check spam/junk folder |
| 16-char password has spaces | Remove all spaces before pasting into `.env` |

---

## Which emails does this app send?

| Trigger | Recipient | Content |
|---------|-----------|---------|
| Super admin creates a new admin | New admin's email | Login credentials (email + temporary password) |
| Admin or intern requests password reset | Requester's email | Password reset link (expires in 1 hour) |

---

## Security Notes

- Never commit your `.env` file — it is listed in `.gitignore`
- Only `.env.example` should be committed to the repository
- App Passwords can be revoked anytime by searching `App Passwords` in your Google Account
- If you suspect the App Password is compromised, revoke it immediately and generate a new one
