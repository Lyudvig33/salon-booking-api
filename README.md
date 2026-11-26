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

## Project structure

```
src/
  main.ts, app.module.ts
  core/
    config/        TypeORM configuration
    decorators/    @SalonId()
    dtos/          request validation
    entities/      TypeORM entities
    enums/
    helpers/       shared constants
    migrations/    database schema
    modules/       feature modules (controllers and services), CoreModule
    validation/    global ValidationPipe
test/              end-to-end tests
```

## Assumptions

- Overlaps are checked per **salon + master**. There is no table of masters, so a
  `masterId` is meaningful only inside its salon. It also means a salon can't
  learn about another salon's bookings from a 409 response.

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

2. **A lock makes the response predictable.** Before inserting, the transaction
   takes `pg_advisory_xact_lock(salonId, masterId)`, so inserts for one master run
   one at a time. Without it, simultaneous inserts sometimes waited for each other
   inside the constraint check, PostgreSQL aborted one with a deadlock (`40P01`),
   and the client got 500 instead of 409.

## AI usage

I used Claude Code (an AI agent). It proposed the design and wrote the code, tests
and this README. I set the requirements and the project structure, and made the
commits.

Checks run by the AI:

- tests, linter and build;
- the concurrency test repeated many times, and the PostgreSQL log inspected for
  deadlocks;
- manual `curl` requests against the running server.

### Where the AI was wrong

- The first version relied only on the exclusion constraint. The tests passed on
  the first run, but when the concurrency test was repeated, 7 of 30 runs failed:
  a request got 500 because of a deadlock. The AI had suspected this while
  planning, reproduced it, and added the advisory lock: 0 failures in 50 runs.

### What I checked myself

<!-- TODO: fill this in yourself before submitting. -->
