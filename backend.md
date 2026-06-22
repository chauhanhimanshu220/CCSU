## Backend Notes

## Backend Stack

- Express API
- SQLite database
- file uploads through `multer`
- static file serving for uploaded documents

## Database

Single `applicants` table stores:

- application ID
- login ID
- hashed password
- session token
- personal details JSON
- education details JSON
- documents JSON
- payment status and payment JSON
- application status
- current step
- timestamps

Database file location:

```text
backend/data/recruitment.db
```

## API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### Applicant

- `GET /api/applicant/me`
- `PUT /api/applicant/personal`
- `PUT /api/applicant/education`
- `POST /api/applicant/documents/:field`
- `DELETE /api/applicant/documents/:field`
- `POST /api/applicant/payment`
- `POST /api/applicant/submit`

### Health

- `GET /api/health`

## Generated Credentials

On first registration:

- application ID is created from row serial
- login ID is created in `CCSUyy####` format
- password is randomly generated
- password is stored as SHA-256 hash

## Validation Rules

- personal details must be complete before record creation
- mobile number must be exactly 10 digits
- PIN code must be exactly 6 digits
- education step validates mandatory academic blocks
- payment requires completed personal, education, and documents
- final submit requires payment status `completed`

## Dynamic Document Rules

Always required:

- high school marksheet
- intermediate marksheet
- graduation marksheet
- ID proof
- domicile proof

Conditionally required:

- post-graduation marksheet if PG is enabled
- category certificate for non-General candidates

## Uploaded Files

Files are stored in:

```text
backend/uploads/
```

Served publicly through:

```text
/uploads/<filename>
```
