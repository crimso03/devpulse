# DevPulse

A simple backend API for tracking bugs and feature requests.

## Live Links

Live API: https://your-deployed-api-url.com  
GitHub: https://github.com/crimso03/devpulse

## Features

- Signup and login
- JWT authentication
- Contributor and maintainer roles
- Create, view, update, and delete issues
- Filter and sort issues

## Tech Stack

Node.js, TypeScript, Express.js, PostgreSQL, pg, bcrypt, jsonwebtoken

## Setup

```bash
npm install
npm run dev
```

Create `.env`:

```env
PORT=5000
DATABASE_URL=your_database_url
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10
NODE_ENV=development
```

Run `schema.sql` in PostgreSQL before starting.

## API Endpoints

```txt
POST /api/auth/signup
POST /api/auth/login
POST /api/issues
GET /api/issues
GET /api/issues/:id
PATCH /api/issues/:id
DELETE /api/issues/:id
```

## Database

`users`: id, name, email, password, role, created_at, updated_at

`issues`: id, title, description, type, status, reporter_id, created_at, updated_at

## Notes

Raw SQL only. No ORM, no query builder, no SQL JOIN.