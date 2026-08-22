# Ticket Booking System

A full-stack platform for booking movie/concert tickets from a visual seat map, with
TTL-based seat holds, automatic checkout-abandonment release, a waitlist with
automatic seat reassignment on cancellation, and QR-code email tickets.

## Stack

- **Backend**: Node.js, TypeScript, Express, PostgreSQL + Prisma ORM, Redis (locks + job queue), BullMQ (delayed jobs), Socket.IO (live seat map), JWT auth, Nodemailer + `qrcode`
- **Frontend**: React + TypeScript, Vite, Tailwind CSS v4, React Router, Socket.IO client
- **Tests**: Jest (concurrency + waitlist integration tests)

## Quick Start (Docker — recommended)

```bash
docker compose up -d
```

This starts Postgres, Redis, the API (port 4000, running migrations automatically), and
the background worker (auto-release / waitlist-offer-expiry jobs). Then run the frontend
separately:

```bash
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:4000
npm install
npm run dev                # http://localhost:5173
```

Seed sample data (admin/organiser/customer accounts + a demo venue and event):

```bash
cd backend
npm install
npx prisma db seed
```
Login with `admin@example.com` / `organiser@example.com` / `customer@example.com`, password `password123`.

## Manual Setup (without Docker)

1. Install and start PostgreSQL and Redis locally.
2. Backend:
   ```bash
   cd backend
   cp .env.example .env    # edit DATABASE_URL / REDIS_URL / JWT_SECRET / SMTP_* as needed
   npm install
   npx prisma generate
   npx prisma migrate dev --name init
   npm run dev              # API on :4000
   ```
3. In a second terminal, start the background worker (required for seat auto-release and
   waitlist offer expiry):
   ```bash
   cd backend
   npm run worker
   ```
4. Frontend:
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev               # http://localhost:5173
   ```

### Email (QR ticket delivery)
Set `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` in `backend/.env`
to any SMTP provider's free tier (e.g. Gmail with an App Password, or
[Ethereal](https://ethereal.email) for a disposable test inbox). If `SMTP_HOST` is left
blank, emails are logged to the console instead of sent — useful for local testing without
credentials.

## Running Tests

```bash
cd backend
docker compose up -d db redis   # from the repo root, if not already running
npx prisma migrate deploy
npm test
```

The test suite includes:
- **`seatHold.concurrency.test.ts`** — fires 2 and then 10 simultaneous hold requests at the
  same seat and asserts exactly one succeeds (the evaluation's core concurrency requirement).
- **`waitlist.test.ts`** — books the only seat in a category, joins the waitlist, cancels the
  booking, and asserts the waitlisted customer is automatically offered the seat with a
  time-limited hold.

## Database Schema (see `backend/prisma/schema.prisma`)

| Model | Purpose |
|---|---|
| `User` | Role-based account: `CUSTOMER` / `ORGANISER` / `ADMIN` |
| `Venue` | Created by an admin; has a fixed physical layout |
| `Seat` | One row per physical seat in a venue (row, column, category) — reused across every event held at that venue |
| `Event` | A specific movie screening or concert instance at a venue, with per-category pricing |
| `EventCategoryPrice` | Price per seat category for a given event |
| `ShowSeat` | **Per-event** seat status (`AVAILABLE` / `HELD` / `BOOKED`) — one row per `(event, seat)`. This is what the seat map renders and what concurrency control operates on. |
| `SeatHold` | An active TTL-based hold on a `ShowSeat` by a customer/session |
| `Booking` / `BookingSeat` | A confirmed (or cancelled) purchase and the seats within it |
| `Waitlist` | Per-event, per-category FIFO queue with `WAITING` / `OFFERED` / `EXPIRED` / `FULFILLED` states |

Splitting `Seat` (physical, venue-level) from `ShowSeat` (per-show status) means the same
venue layout can be reused across many events without duplicating seat geography, while
each event/show tracks its own independent availability.

## Seat Hold, Concurrency, and Waitlist Logic

See [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md) for the full write-up. In short:

- **Hold + TTL**: `POST /api/events/:eventId/holds` places a hold with a configurable TTL
  (`SEAT_HOLD_TTL_SECONDS`, default 600s). A BullMQ delayed job is scheduled to auto-release
  the seat if checkout isn't completed in time; the job is cancelled if the booking completes
  or the hold is released early.
- **Concurrency protection**: every hold/release/book operation on a seat is serialized by a
  Redis distributed lock keyed on `(eventId, seatId)`, and the actual state transition is a
  conditional DB update (`updateMany` with a `WHERE status = <expected>` clause) inside a
  transaction — so even a lock bypass can't double-sell a seat.
- **Waitlist**: joining requires the category to actually be sold out. On cancellation, the
  freed seat is offered (with its own TTL) to the longest-waiting customer for that category;
  if they don't complete checkout in time, a scheduled job expires the offer and cascades it
  to the next person in line.

## API Overview

All authenticated routes take `Authorization: Bearer <token>`.

| Method & Path | Role | Description |
|---|---|---|
| `POST /api/auth/register` | — | Register (customer/organiser/admin) |
| `POST /api/auth/login` | — | Log in, returns JWT |
| `GET /api/auth/me` | any | Current user |
| `POST /api/venues` | ADMIN | Create venue + seat layout |
| `GET /api/venues` | any | List venues |
| `POST /api/events` | ORGANISER/ADMIN | Create event listing + pricing |
| `GET /api/events` | — | Browse/filter events (`?type=MOVIE\|CONCERT`) |
| `GET /api/events/:id/seatmap` | — | Live seat map for an event |
| `POST /api/events/:id/holds` | CUSTOMER | Hold one or more seats (TTL) |
| `DELETE /api/events/:id/holds/:seatId` | CUSTOMER | Release a hold early |
| `POST /api/events/:id/bookings` | CUSTOMER | Confirm booking from held seats → QR email |
| `POST /api/events/:id/waitlist` | CUSTOMER | Join the waitlist for a sold-out category |
| `GET /api/events/:id/revenue` | ORGANISER/ADMIN | Booking summary & revenue |
| `GET /api/bookings` | CUSTOMER | Booking history |
| `GET /api/bookings/waitlist/mine` | CUSTOMER | My waitlist entries |
| `DELETE /api/bookings/:id` | CUSTOMER | Cancel a booking → triggers waitlist offer |

Socket.IO: clients `emit('event:subscribe', eventId)` to join a room and receive
`seat:update` events whenever any seat's status changes.

## Deployment

The `docker-compose.yml` at the repo root is deployable as-is to Render/Railway (each
service — `db`, `redis`, `backend`, `worker` — maps to a Render/Railway service), or you can
provision managed Postgres + Redis and deploy `backend` (with `worker` as a second process)
and `frontend` (as a static site, `npm run build` → `dist/`) separately.

## Project Structure

```
ticket-booking-system/
├── backend/
│   ├── prisma/schema.prisma      # DB schema
│   ├── prisma/seed.ts            # sample data
│   └── src/
│       ├── controllers/          # request handlers
│       ├── services/             # seat hold, waitlist, booking business logic
│       ├── jobs/                 # BullMQ queues + worker (TTL expiry)
│       ├── middleware/           # auth, error handling
│       ├── sockets/               # Socket.IO seat-update broadcaster
│       ├── utils/                # lock, jwt, qr, email, prisma/redis clients
│       └── __tests__/            # concurrency + waitlist tests
├── frontend/
│   └── src/
│       ├── pages/                 # Events, EventDetail (seat map), Bookings, Organiser, Admin
│       ├── context/AuthContext.tsx
│       └── components/
├── docker-compose.yml
└── SYSTEM_DESIGN.md
```
