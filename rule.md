## Recruitment Portal Rules

## Entry and registration

- Login page is the default entry point.
- New users start through `Click Here for New Registration`.
- Personal details create the first applicant record.
- Login ID and Password are auto-generated only after personal details save succeeds.

## Credential popup

- popup must display login ID and password clearly
- popup must allow copy action
- `Cut / Close` returns candidate to login page
- `Continue` sends candidate directly to educational details

## Save and resume

- every save writes data to the database
- candidate can close portal and continue later
- login must restore already saved data
- dashboard must reflect current resume point

## Editing

- dashboard must provide `Edit Personal Details`
- personal details reopen with pre-filled data
- mobile number cannot be changed
- edit flow still follows personal -> education -> documents -> payment

## Payment

- payment is mandatory before final submit
- unpaid dashboard `Apply for Post` must open payment pending popup
- payment pending popup:
  - `Cut` keeps candidate on dashboard
  - `Continue` redirects candidate to payment page

## Final submit

- final submit validates all sections
- successful first submission redirects to login page after popup close
- successful edit re-submission returns to dashboard after popup close
