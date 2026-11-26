import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { Appointment } from '../src/core/entities/appointment.entity.js';
import { AppointmentStatus } from '../src/core/enums/appointment-status.enum.js';

describe('GET /reports/revenue', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0);
    dataSource = app.get(DataSource);
  });

  beforeEach(() => dataSource.query('TRUNCATE appointments RESTART IDENTITY'));

  afterAll(() => app.close());

  /** Inserts a one-second appointment: done, salon 1, master 5 by default. */
  const add = (startsAt: string, overrides: Partial<Appointment> = {}) =>
    dataSource.getRepository(Appointment).insert({
      salonId: 1,
      masterId: 5,
      startsAt: new Date(startsAt),
      endsAt: new Date(Date.parse(startsAt) + 1000),
      priceCents: 1500,
      status: AppointmentStatus.Done,
      ...overrides,
    });

  const report = (month: string, salonId = '1') =>
    request(app.getHttpServer())
      .get('/reports/revenue')
      .query({ month })
      .set('X-Salon-Id', salonId);

  it('sums revenue and counts appointments per master', async () => {
    await add('2026-10-05T10:00:00Z');
    await add('2026-10-06T10:00:00Z');
    await add('2026-10-07T10:00:00Z');
    await add('2026-10-05T10:00:00Z', { masterId: 3, priceCents: 700 });

    const response = await report('2026-10').expect(200);

    expect(response.body).toEqual([
      { masterId: 3, revenueCents: 700, count: 1 },
      { masterId: 5, revenueCents: 4500, count: 3 },
    ]);
  });

  it('counts only done appointments', async () => {
    await add('2026-10-05T10:00:00Z');
    await add('2026-10-06T10:00:00Z', { status: AppointmentStatus.Booked });
    await add('2026-10-07T10:00:00Z', { status: AppointmentStatus.Cancelled });

    const response = await report('2026-10').expect(200);

    expect(response.body).toEqual([
      { masterId: 5, revenueCents: 1500, count: 1 },
    ]);
  });

  it('shows a salon only its own revenue', async () => {
    await add('2026-10-05T10:00:00Z');
    await add('2026-10-05T10:00:00Z', { salonId: 2, priceCents: 999 });

    const response = await report('2026-10', '2').expect(200);

    expect(response.body).toEqual([
      { masterId: 5, revenueCents: 999, count: 1 },
    ]);
  });

  // Kyiv is UTC+3 in summer and UTC+2 in winter.
  it.each([
    // starts in summer time, ends in winter time
    ['2026-10', '2026-09-30T21:00:00Z', '2026-10-31T22:00:00Z'],
    // crosses the new year
    ['2026-12', '2026-11-30T22:00:00Z', '2026-12-31T22:00:00Z'],
    // starts in winter time, ends in summer time
    ['2027-03', '2027-02-28T22:00:00Z', '2027-03-31T21:00:00Z'],
  ])('takes %s by Kyiv time', async (month, first, nextMonth) => {
    const secondBefore = (instant: string) =>
      new Date(Date.parse(instant) - 1000).toISOString();
    await add(secondBefore(first), { priceCents: 1 });
    await add(first, { priceCents: 10 });
    await add(secondBefore(nextMonth), { priceCents: 100 });
    await add(nextMonth, { priceCents: 1000 });

    const response = await report(month).expect(200);

    expect(response.body).toEqual([
      { masterId: 5, revenueCents: 110, count: 2 },
    ]);
  });

  it('returns sums larger than a 32-bit integer', async () => {
    await add('2026-10-05T10:00:00Z', { priceCents: 2_000_000_000 });
    await add('2026-10-06T10:00:00Z', { priceCents: 2_000_000_000 });

    const response = await report('2026-10').expect(200);

    expect(response.body[0].revenueCents).toBe(4_000_000_000);
  });

  it('returns an empty list for a month without revenue', async () => {
    await report('2026-10').expect(200, []);
  });

  it.each([
    '',
    '2026',
    '2026-1',
    '2026-13',
    '2026-00',
    '2026-10-01',
    '0000-01',
  ])('rejects month "%s" with 400', async (month) => {
    await report(month).expect(400);
  });

  it('rejects a request without month with 400', async () => {
    await request(app.getHttpServer())
      .get('/reports/revenue')
      .set('X-Salon-Id', '1')
      .expect(400);
  });

  it('rejects a request without X-Salon-Id with 400', async () => {
    await request(app.getHttpServer())
      .get('/reports/revenue?month=2026-10')
      .expect(400);
  });
});
