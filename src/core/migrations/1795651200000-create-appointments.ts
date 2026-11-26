import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppointments1795651200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Lets a GiST index compare plain integers with "=".
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS btree_gist');
    await queryRunner.query(`
      CREATE TABLE appointments (
        id serial PRIMARY KEY,
        "salonId" integer NOT NULL,
        "masterId" integer NOT NULL,
        "startsAt" timestamptz NOT NULL,
        "endsAt" timestamptz NOT NULL,
        "priceCents" integer NOT NULL CHECK ("priceCents" >= 0),
        status text NOT NULL DEFAULT 'booked'
          CHECK (status IN ('booked', 'done', 'cancelled')),
        CHECK ("endsAt" > "startsAt"),
        -- No two active appointments of one master may overlap.
        -- tstzrange is [start, end), so back-to-back appointments are allowed.
        CONSTRAINT appointments_no_overlap EXCLUDE USING gist (
          "salonId" WITH =,
          "masterId" WITH =,
          tstzrange("startsAt", "endsAt") WITH &&
        ) WHERE (status <> 'cancelled')
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE appointments');
  }
}
