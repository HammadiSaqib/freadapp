# Zoom Consultation Booking System

## Database setup

Apply `server/database/migrations/20260812_zoom_consultation_booking.sql` to the production MySQL database before starting the new build:

```bash
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p "$MYSQL_DATABASE" < server/database/migrations/20260812_zoom_consultation_booking.sql
```

The migration creates the central settings, weekly availability, blackout, and appointment tables. The database-enforced `active_slot_key` unique key is the final concurrency guard: only one active appointment can reserve a UTC start time. Cancellation clears the key and releases the slot.

The backend also runs the same schema creation idempotently on the first consultation API request. This keeps new development databases usable without a separate migration step; applying the checked-in migration explicitly remains the recommended production deployment workflow.

## Environment variables

```env
# Zoom Server-to-Server OAuth (backend only)
ZOOM_ACCOUNT_ID=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
ZOOM_HOST_USER_ID=

# Booking notification destination
CONSULTATION_NOTIFICATION_EMAIL=consultations@example.com

# Existing SMTP configuration used for customer/internal confirmations
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM_NAME=Score Machine Consultations
EMAIL_FROM_ADDRESS=

# Used in secure cancellation/reschedule links
FRONTEND_URL=https://example.com
```

Do not expose any `ZOOM_*` values through Vite variables or frontend code.

## Zoom configuration

1. In the Zoom App Marketplace, create an account-level Server-to-Server OAuth app owned by the company's central Zoom account.
2. Add scopes that allow reading users and creating/updating/deleting meetings (for example `meeting:write:admin` and the applicable user-read scope required by the account).
3. Activate the app and copy its Account ID, Client ID, and Client Secret into the server environment.
4. Set `ZOOM_HOST_USER_ID` to the licensed Zoom user's email or Zoom user ID that will host every consultation.
5. Restart the backend and make one test booking. Customers receive only `join_url`; `start_url` is returned only by strict Super Admin management endpoints.

Bookings fail closed when Zoom is not configured or meeting creation fails. The reserved database slot is released and the record is marked `zoom_failed`, so the system never confirms an appointment without a Zoom meeting.

## Super Admin setup

1. Sign in through the Super Admin portal.
2. Open **Appointments**.
3. In **Meeting Availability**, choose the IANA timezone, booking window, and minimum notice.
4. Delete/edit the seeded Monday-Friday ranges as needed and add multiple ranges per day for breaks.
5. Add full-day or partial-day blocks under **Blocked Dates & Times**.

Existing appointments retain their stored UTC date/time and original timezone if the global schedule timezone changes. Only newly generated availability uses the new timezone.

## User entry points

- Public website: `/book-appointment`
- Admin customer dashboard: `/consultations`
- Super Admin: `/super-admin/appointments` (or `/appointments` on the Super Admin subdomain)
- Secure email management links: `/manage-consultation`

## API routes

Public/shared:

- `GET /api/appointments/config`
- `GET /api/appointments/availability?date=YYYY-MM-DD`
- `POST /api/appointments/public/book`
- `POST /api/appointments/cancel/:token`
- `POST /api/appointments/reschedule/:token`

Admin customer (JWT role `admin` only):

- `POST /api/appointments/admin/book`
- `GET /api/appointments/admin/my`

Super Admin (JWT role `super_admin` only):

- `GET /api/appointments/manage/overview`
- `PUT /api/appointments/manage/settings`
- `POST|PUT|DELETE /api/appointments/manage/availability[/:id]`
- `POST|DELETE /api/appointments/manage/blocked-dates[/:id]`
- `PUT /api/appointments/manage/appointments/:id/status`

## Verification and deployment

```bash
npx vitest run tests/consultationAvailability.test.ts
npm run build
npm run start
```

Smoke-test a future Monday in the configured timezone, one Admin booking, one public booking, cancellation, rescheduling, and the Super Admin host link. Also submit two simultaneous requests with different idempotency keys for the same slot and verify one returns HTTP 409.

The focused availability test covers 30-minute generation, shared booking exclusion, full and partial blocks, split daily periods, and the America/New_York daylight-saving offset transition.
