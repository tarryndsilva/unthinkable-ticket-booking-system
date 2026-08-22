# System Design Write-Up

## 1. Seat Hold & TTL Mechanism

Each venue has a fixed set of physical `Seat` rows, reused across every event held there.
Availability itself is tracked per-event in a separate `ShowSeat` table (one row per
`(event, seat)` pair), with a `status` of `AVAILABLE`, `HELD`, or `BOOKED`. This split lets
the same venue layout serve many events without duplicating geometry, while each event's
seat map stays fully independent.

When a customer selects seats, `POST /events/:id/holds` transitions the relevant
`ShowSeat` rows to `HELD` and stamps a `heldUntil` timestamp `now + SEAT_HOLD_TTL_SECONDS`
(default 10 minutes, configurable via env var). A `SeatHold` row records who holds it and
under which browser session. Rather than relying on a polling sweep to find expired holds,
a **BullMQ delayed job** is scheduled at hold-time with `delay = TTL`, keyed by
`release:<showSeatId>`. When it fires, a worker process calls `autoReleaseExpiredHold`,
which re-checks the hold hasn't already been renewed/booked before flipping the seat back
to `AVAILABLE`. If the booking completes or the hold is released early, the corresponding
job is cancelled via BullMQ's `job.remove()`, so no stale release ever fires against a
seat that's already moved on. This event-driven approach avoids the latency and load of a
cron-style sweep while still guaranteeing release within one TTL window even under
worker restarts, since BullMQ persists delayed jobs in Redis.

## 2. Concurrency Prevention

Seat holding is the system's highest-risk race: two customers can click the same seat
within milliseconds. Two independent layers guard against a double-hold or double-book:

**Layer 1 — Redis distributed lock.** Every hold, release, and booking-confirmation
operation on a seat first acquires a lock keyed `lock:seat:<eventId>:<seatId>` via
`SET key value NX PX <ttl>` (atomic acquire-if-absent, with an auto-expiring TTL as a
safety net against a crashed holder). Only the request that sets the key proceeds;
concurrent requests retry briefly, then fail with a 409. Release uses a Lua script that
only deletes the key if the caller's own token still owns it, so no request can release a
lock it doesn't hold.

**Layer 2 — Database compare-and-swap.** Even with the lock held, the state transition
inside the transaction is a *conditional* update:
`UPDATE show_seat SET status='HELD' WHERE id=? AND status='AVAILABLE'`, checking the
returned row count. If the row wasn't actually `AVAILABLE` (a lock bug, a Redis failover
edge case, a direct DB write), the update matches zero rows and fails cleanly instead of
silently overwriting another booking. The database stays the ultimate source of truth;
correctness doesn't depend on the lock alone. The same CAS pattern secures
`HELD → BOOKED` on checkout and `HELD → AVAILABLE` on release.

For multi-seat selections, seats are locked one at a time in **sorted order** (by seat
ID) to prevent two multi-seat requests from deadlocking each other. If any seat in the
batch fails, seats already acquired in that same request are rolled back, so a customer
never ends up holding a partial, unusable selection.

## 3. Waitlist Auto-Assignment Flow

A customer can only join a category's waitlist once every seat in that category is
already `HELD` or `BOOKED` — this is checked server-side, not just hidden client-side,
to prevent queue-jumping around genuinely available seats. Waitlist entries are ordered
strictly FIFO by `createdAt`.

When a `Booking` is cancelled, each seat it held is released individually. Rather than
simply flipping the seat back to `AVAILABLE`, `offerSeatToNextInWaitlist` first checks
for a `WAITING` entry in that seat's category (locked via a per-category Redis lock to
avoid two concurrently-cancelling bookings racing to offer seats to the same person
twice). If someone is waiting, the seat is put into `HELD` again — this time on behalf of
the offered customer specifically — and the waitlist entry moves to `OFFERED` with its
own `offerExpiresAt`. An email is sent immediately with the time limit. If nobody is
waiting, the seat is released to `AVAILABLE` as normal, exactly like an expired hold.

## 4. Time-Limited Offer Handling

The offer reuses the same delayed-job infrastructure as seat holds, but on a separate
BullMQ queue (`waitlist-offer`) keyed by `offer:<waitlistId>`, with its own configurable
TTL (`WAITLIST_OFFER_TTL_SECONDS`, default 15 minutes). If the offered customer completes
checkout first, `confirmBooking` detects the seat has no active `SeatHold` row (a
waitlist-offer hold, unlike a normal hold, isn't tied to a `SeatHold` record) and treats
ownership by the offered customer's ID as valid; on success it marks the waitlist entry
`FULFILLED` and cancels the pending expiry job. If the TTL fires first,
`expireWaitlistOffer` marks the entry `EXPIRED` and immediately re-invokes
`offerSeatToNextInWaitlist` for the same seat — cascading the offer down the queue with no
manual intervention, until either someone claims it or the queue is exhausted and the seat
falls back to `AVAILABLE`.
