# Intern Management System

A full-stack web application for managing internship programs. Built with React Vite, Node.js Express, and PostgreSQL.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Vite (pure JSX) |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JWT + bcryptjs |
| File Upload | Multer (memory storage) |
| Email | Nodemailer + Gmail SMTP |
| Icons | Tabler Icons |

---

## User Roles

| Role | Access |
|------|--------|
| Super Admin | Manage admins, all batches, all interns |
| Admin | Manage assigned batch, approve/reject interns, assign projects and tasks |
| Intern | View profile, view project, update task status |


## Prerequisites

- Node.js v18 or higher
- PostgreSQL v14 or higher
- A Gmail account with App Password enabled

---

## Environment Setup

### server/.env

Copy `server/.env.example` to `server/.env` and fill in your values:

```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/db_name
JWT_SECRET=your_long_random_secret_minimum_32_characters
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=xxxx_xxxx_xxxx_xxxx
SUPER_ADMIN_EMAIL=superadmin@company.com
SUPER_ADMIN_PASSWORD=SuperAdmin@123
SUPER_ADMIN_NAME=Super Admin
```

| Variable | Description |
|----------|-------------|
| `PORT` | Port the backend server runs on |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens — make it long and random |
| `JWT_EXPIRES_IN` | Token expiry duration (e.g. 7d, 24h) |
| `CLIENT_URL` | Frontend URL — used for password reset email links |
| `SERVER_URL` | Backend URL |
| `GMAIL_USER` | Gmail address used to send emails |
| `GMAIL_APP_PASSWORD` | 16-character Gmail App Password (not your Gmail login password) |
| `SUPER_ADMIN_EMAIL` | Email for the super admin account |
| `SUPER_ADMIN_PASSWORD` | Password for the super admin account |
| `SUPER_ADMIN_NAME` | Display name for the super admin |

### client/.env

Copy `client/.env.example` to `client/.env`:

```env
VITE_API_URL=http://localhost:5000
```

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL the frontend calls |

---

## Gmail App Password Setup

1. Go to your Google Account → Security
2. Enable 2-Step Verification if not already enabled
3. Go to Security → App Passwords
4. Select app: Mail, Select device: Other (type "Intern App")
5. Click Generate — copy the 16-character password
6. Paste it into `GMAIL_APP_PASSWORD` in `server/.env`

> Note: This is different from your Gmail login password.

---

## Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd project-root
```

### 2. Install server dependencies

```bash
cd server
npm install
```

### 3. Install client dependencies

```bash
cd client
npm install
```

---

## Database Setup

Make sure PostgreSQL is running and your `DATABASE_URL` in `server/.env` is correct.

Run these commands from the `server/` directory:

### Create all tables
```bash
npm run migrate
```

### Seed the super admin account
```bash
npm run seed:superadmin
```

### Run migrate + seed together
```bash
npm run setup
```

---

## Database Script Reference

Run all scripts from inside the `server/` directory:

| Script | Command | Description |
|--------|---------|-------------|
| Migrate | `npm run migrate` | Creates all tables. Safe to run multiple times. |
| Seed Super Admin | `npm run seed:superadmin` | Creates the super admin from `.env` values. |
| Setup | `npm run setup` | Runs migrate + seed:superadmin together. |
| Drop | `npm run drop` | ⚠️ Drops all tables. Deletes all data permanently. |
| Reset | `npm run reset` | ⚠️ Drops all tables then runs setup. Full fresh start. |

---

## Running the Project

Open two terminals:

### Terminal 1 — Backend

```bash
cd server
npm run dev
```

Server runs at `http://localhost:5000`

### Terminal 2 — Frontend

```bash
cd client
npm run dev
```

App runs at `http://localhost:5173`

---

## Default Super Admin Login

After running `npm run seed:superadmin`, log in with the credentials you set in `server/.env`:
Email:    value of SUPER_ADMIN_EMAIL
Password: value of SUPER_ADMIN_PASSWORD

---

## Registration Flow

Interns register via the public registration page using a **Batch Registration Key** provided by their admin. Registration goes through a 4-step form:

1. Personal Details
2. Contact Details
3. Program Details (batch key entry)
4. Review & Submit

Intern accounts are **pending** until an admin approves them.

---

## Notes

- Never commit your `.env` files — they are in `.gitignore`
- Only `.env.example` files should be committed
- Passwords are hashed with bcryptjs — never stored in plain text
- Photos are stored as PostgreSQL `bytea` blobs



commit for new mail server