<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Operations Dashboard

This repo contains the existing Vite + React frontend and a new `backend/` service built with Node.js, Express, TypeScript, PostgreSQL, Prisma, and JWT authentication.

## Local setup

### Frontend

1. Install root dependencies:
   `npm install`
2. Create `.env.local` from `.env.example`
3. Run only the frontend:
   `npm run dev`

### Backend

1. Install backend dependencies:
   `npm --prefix backend install`
2. Create `backend/.env` from `backend/.env.example`
3. Update `DATABASE_URL` to point to a PostgreSQL database
4. Generate the Prisma client:
   `npm run prisma:generate`
5. Validate the Prisma schema:
   `npm run prisma:validate`
6. Run the backend:
   `npm run dev:backend`

### Run both together

Use:

`npm run dev:full`

## Backend API overview

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/change-password`
- `POST /api/auth/logout`
- CRUD/MVP routes under `/api/settings`, `/api/agents`, `/api/incidents`, `/api/meetings`, `/api/daily-notes`, `/api/notifications`, `/api/report-exports`, `/api/schedules`
- Local-storage migration import route: `POST /api/migration/local-storage`

## Incremental migration approach

The frontend localStorage model remains intact for now. The backend includes an authenticated import endpoint that accepts the current app-shaped data for agents, incidents, meetings, daily notes, notifications, report exports, settings, and weekend schedule so migration can happen incrementally instead of as a hard cut-over.
