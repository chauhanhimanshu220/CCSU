## CCSU Meerut Recruitment Portal

Full-stack university recruitment portal built from scratch for the workflow described in the brief:

- login-first entry point
- new registration from personal details
- auto-generated login ID and password popup
- educational details step
- document upload step
- payment step
- final submit validation
- dashboard after login
- edit personal details flow with mobile number locked
- save-and-resume support at every stage
- payment pending restriction on `Apply for Post`

## Stack

- Frontend: React + Vite + React Router
- Backend: Node.js + Express
- Database: SQLite via `better-sqlite3`
- Uploads: `multer`
- Runtime: Node 24+

## Run Locally

### 1. Install dependencies

Root, frontend, and backend dependencies are already installed in this workspace. If needed:

```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

### 2. Start both frontend and backend

```bash
npm run dev
```

This runs:

- frontend on `http://localhost:5173`
- backend on `http://localhost:4000`

### 3. Production build

```bash
npm run build
```

### 4. Start only backend

```bash
npm start
```

## Project Structure

```text
frontend/
  src/
    components/
    context/
    pages/
backend/
  data/
  uploads/
  src/
```

## Main User Flows

### New registration

1. Candidate lands on login page.
2. Candidate clicks `Click Here for New Registration`.
3. Candidate fills personal details.
4. Backend creates record and generates:
   - application ID
   - login ID
   - password
5. Popup shows credentials with copy option.
6. `Cut / Close` sends user back to login page.
7. `Continue` moves user to educational details.

### Application completion

1. Educational details are saved.
2. Documents are uploaded and stored immediately.
3. Payment is completed.
4. Final submit validates all sections.
5. Success popup appears.

### Dashboard flow

After login, dashboard shows:

- candidate identity snapshot
- application status
- payment summary
- progress cards
- `Apply for Post`
- `Edit Personal Details`

### Edit mode

- personal details reopen in edit mode
- mobile number remains locked
- saved values are pre-filled
- final submit returns user to dashboard instead of login page

## Important Business Logic

- Every step persists to the database.
- Resume point is derived from saved progress.
- Payment must be completed before final submit.
- `Apply for Post` shows a payment pending popup if fee is unpaid.
- Category certificate becomes required for non-General categories.
- Post-graduation marksheet becomes required only if PG details are enabled.

## Verification Completed

The following checks were run successfully:

- frontend production build
- backend module load
- backend health endpoint
- end-to-end API smoke test:
  - register
  - save education
  - upload required documents
  - complete payment
  - final submit
