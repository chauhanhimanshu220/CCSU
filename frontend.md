## Frontend Notes

## Routes

- `/`:
  login page and new registration entry point

- `/apply?mode=register&step=personal`:
  first-time registration wizard

- `/apply?mode=resume&step=<step>`:
  continue saved draft flow

- `/apply?mode=edit&step=personal`:
  edit mode flow after dashboard login

- `/dashboard`:
  candidate landing page after login

## State Model

Frontend session is managed through `AuthContext`:

- token
- applicant snapshot
- loading state
- logout and refresh helpers

Session is persisted in local storage so the UI can restore context after refresh.

## Wizard Steps

### Personal details

- used for first-time registration
- also reused in edit mode
- mobile number disabled after registration
- first registration triggers credentials popup

### Educational details

- high school
- intermediate
- graduation
- optional post-graduation
- additional qualification notes

### Document upload

- uploads are immediate, not deferred
- uploaded status is shown per document
- required checklist is driven by backend
- `Save & Next` becomes useful once required docs are present

### Payment

- fee amount comes from backend
- payment completion is simulated through secure-form style UI
- final submit is enabled only after payment success

## Dashboard

Dashboard shows:

- application ID
- login ID
- completion cards
- payment details
- submission status
- resume point

## UI Direction

- warm cream background with green and amber accents
- serif headings for formal institutional tone
- rounded glass-like panels
- mobile-responsive grids
- modal-driven credential and submit confirmations
