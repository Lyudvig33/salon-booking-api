# Salon Booking API

REST API for salon appointments: NestJS, TypeORM and PostgreSQL.

## Requirements

- Node.js 24 (see `.nvmrc`)
- Docker with Docker Compose

## Run

```bash
nvm use                        # or install the Node.js version from .nvmrc
npm install
docker compose up -d --wait    # PostgreSQL on localhost:5433
npm start                      # API on http://localhost:3000
```

Database migrations are applied automatically on application start. PostgreSQL is
published on port **5433** to avoid clashing with a locally installed one.

The defaults need no configuration. To change `PORT` or `DATABASE_URL`, copy
`.env.example` to `.env`.

## Test

```bash
npm test
```

The command starts PostgreSQL if needed and runs end-to-end tests against a real,
separate database (`salon_test`). Docker must be running.

The test database is created when the PostgreSQL volume is first initialized. To
start from scratch: `docker compose down -v`.

## API

Every request must have an `X-Salon-Id` header (a positive integer): the salon of
the current user.

Swagger UI is available at http://localhost:3000/docs (an addition beyond the task
requirements, for trying the endpoints by hand).

### `POST /appointments`

```bash
curl -i -X POST http://localhost:3000/appointments \
  -H 'X-Salon-Id: 1' -H 'Content-Type: application/json' \
  -d '{"masterId": 7, "startsAt": "2026-12-01T10:00:00+02:00", "endsAt": "2026-12-01T11:00:00+02:00", "priceCents": 3000}'
```

| Status | When |
|---|---|
| 201 | The appointment is created with status `booked` |
| 400 | Invalid header or body, or `endsAt` is not later than `startsAt` |
| 409 | The master already has an appointment that overlaps this time |

Dates must include a time zone offset (`+02:00` or `Z`). Responses return them in
UTC.

### `PATCH /appointments/:id/status`

```bash
curl -i -X PATCH http://localhost:3000/appointments/1/status \
  -H 'X-Salon-Id: 1' -H 'Content-Type: application/json' \
  -d '{"status": "done"}'
```

Allowed transitions: `booked` → `done` and `booked` → `cancelled`.

| Status | When |
|---|---|
| 200 | The status is changed; the response is the appointment |
| 400 | Invalid header, id or status value |
| 404 | No such appointment, or it belongs to another salon |
| 409 | Any other transition |

The update itself has the condition `status = 'booked'`, so of two simultaneous
changes only one succeeds.

### `GET /reports/revenue?month=2026-10`

```bash
curl -i 'http://localhost:3000/reports/revenue?month=2026-10' -H 'X-Salon-Id: 1'
```

Revenue of the salon's masters for a month, counting only `done` appointments:

```json
[{ "masterId": 5, "revenueCents": 4500, "count": 3 }]
```

Masters without revenue in that month are not listed. An invalid header or `month`
(`YYYY-MM`) gives 400.

## Project structure

```
src/
  main.ts, app.module.ts
  core/
    config/        TypeORM and Swagger configuration
    decorators/    @SalonId()
    dtos/          request validation
    entities/      TypeORM entities
    enums/
    helpers/       shared constants
    migrations/    database schema
    models/        response shapes
    modules/       feature modules (controllers and services), CoreModule
    validation/    global ValidationPipe
test/              end-to-end tests
```

## Assumptions

- Overlaps are checked per **salon + master**. There is no table of masters, so a
  `masterId` is meaningful only inside its salon. It also means a salon can't
  learn about another salon's bookings from a 409 response.
- The report uses **Europe/Kyiv** for every salon, as the task requires. Per-salon
  time zones would need a table of salons, which the task rules out.
- `revenueCents` is a JSON number, as in the task. It is exact up to 2^53 cents
  (about 90 trillion euros), which is far beyond any real monthly revenue.
- Tests are end-to-end against a real PostgreSQL. The key logic (the overlap
  constraint, the locks, the month boundaries) lives in SQL, so tests with a mocked
  repository would not check it.

## Protection against double booking

1. **The guarantee is in the database.** An exclusion constraint rejects two
   non-cancelled appointments of the same salon and master with overlapping time
   ranges:

   ```sql
   EXCLUDE USING gist (
     "salonId" WITH =,
     "masterId" WITH =,
     tstzrange("startsAt", "endsAt") WITH &&
   ) WHERE (status <> 'cancelled')
   ```

   `tstzrange` includes the start and excludes the end, so an appointment may
   start exactly when another one ends. The violation (`23P01`) is returned as 409.

   A "select, then insert" check in the application would not be enough: two
   simultaneous requests could both see a free slot.

2. **A lock makes the response predictable.** Creating an appointment and changing
   its status first take `pg_advisory_xact_lock(salonId, masterId)` in a
   transaction, so writes for one master run one at a time. Without it,
   simultaneous writes sometimes waited for each other inside the constraint check,
   PostgreSQL aborted one with a deadlock (`40P01`), and the client got 500.

## How the month is computed

The month is a calendar month in **Europe/Kyiv**, and an appointment belongs to it
by `startsAt`. The range includes its start and excludes its end:

```sql
"startsAt" >= '2026-10-01'::timestamp AT TIME ZONE 'Europe/Kyiv'
AND "startsAt" < ('2026-10-01'::timestamp + interval '1 month') AT TIME ZONE 'Europe/Kyiv'
```

PostgreSQL turns each local midnight into an instant using its time zone database,
so daylight saving time is handled. October 2026 starts at
`2026-09-30T21:00:00Z` (UTC+3) and ends at `2026-10-31T22:00:00Z` (UTC+2). The
result doesn't depend on the time zone of the server or the database session.

A partial index on `("salonId", "startsAt") WHERE status = 'done'` lets the report
read only the requested month instead of the salon's whole history.

## AI usage

I used Claude Code (an AI agent). It proposed the design and wrote the code, tests
and this README. I set the requirements and the project structure, and made the
commits.

Checks run by the AI:

- tests, linter and build;
- the concurrency test repeated many times, and the PostgreSQL log inspected for
  deadlocks;
- the report temporarily switched to UTC, to confirm that the month boundary tests
  fail;
- a run from scratch (fresh dependencies and database) and manual `curl` requests
  against the running server.

### Where the AI was wrong

- The first version relied only on the exclusion constraint. The tests passed on
  the first run, but when the concurrency test was repeated, 7 of 30 runs failed:
  a request got 500 because of a deadlock. The AI had suspected this while
  planning, reproduced it, and added the advisory lock: 0 failures in 50 runs.
- The lock was first added only to creation. A temporary stress test that marked
  appointments `done` while other requests booked the same time produced 98
  deadlocks between the `UPDATE` and the `INSERT`. After the status change took the
  same lock: 0 deadlocks in 1500 rounds.

### What I checked myself

- Created appointments for two salons and changed their statuses in Swagger UI.
- The revenue report was empty for a month without `done` appointments, and showed
  `revenueCents: 3000`, `count: 1` for December after an appointment was marked
  `done`.
- A second appointment for the same master at the same time was rejected with 409.
