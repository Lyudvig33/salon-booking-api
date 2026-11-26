import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';

const body = {
  masterId: 7,
  startsAt: '2026-12-01T10:00:00+02:00',
  endsAt: '2026-12-01T11:00:00+02:00',
  priceCents: 3000,
};

describe('Appointments', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    // Listen once, so parallel requests share one running server.
    await app.listen(0);
    dataSource = app.get(DataSource);
  });

  beforeEach(() => dataSource.query('TRUNCATE appointments RESTART IDENTITY'));

  afterAll(() => app.close());

  const create = (overrides: object = {}, salonId = '1') =>
    request(app.getHttpServer())
      .post('/appointments')
      .set('X-Salon-Id', salonId)
      .send({ ...body, ...overrides });

  describe('POST /appointments', () => {
    it('creates a booked appointment', async () => {
      const response = await create().expect(201);

      expect(response.body).toEqual({
        id: 1,
        salonId: 1,
        masterId: 7,
        startsAt: '2026-12-01T08:00:00.000Z',
        endsAt: '2026-12-01T09:00:00.000Z',
        priceCents: 3000,
        status: 'booked',
      });
    });

    it.each([
      ['endsAt equal to startsAt', { endsAt: body.startsAt }],
      ['endsAt before startsAt', { endsAt: '2026-12-01T09:00:00+02:00' }],
      ['a date without an offset', { startsAt: '2026-12-01T10:00:00' }],
      ['a date without time', { startsAt: '2026-12-01' }],
      ['a non-existent day', { startsAt: '2026-11-31T10:00:00+02:00' }],
      ['a leap second', { startsAt: '2026-12-01T09:59:60+02:00' }],
      ['an impossible offset', { startsAt: '2026-12-01T10:00:00+99:00' }],
      ['a string masterId', { masterId: '7' }],
      ['a missing masterId', { masterId: undefined }],
      ['a too large masterId', { masterId: 2_147_483_648 }],
      ['a negative price', { priceCents: -1 }],
      ['a fractional price', { priceCents: 10.5 }],
      ['an unknown property', { status: 'done' }],
    ])('rejects %s with 400', async (_name, overrides) => {
      await create(overrides).expect(400);
    });

    it.each(['', 'abc', '0', '-1', '1.5', '2147483648'])(
      'rejects X-Salon-Id "%s" with 400',
      async (salonId) => {
        await create({}, salonId).expect(400);
      },
    );

    it('rejects a request without X-Salon-Id with 400', async () => {
      await request(app.getHttpServer())
        .post('/appointments')
        .send(body)
        .expect(400);
    });

    it.each([
      ['the same time', '10:00', '11:00'],
      ['an overlapping start', '09:30', '10:30'],
      ['an overlapping end', '10:30', '11:30'],
      ['a time inside', '10:15', '10:45'],
      ['a time around', '09:00', '12:00'],
    ])('rejects %s with 409', async (_name, from, to) => {
      await create().expect(201);

      await create({
        startsAt: `2026-12-01T${from}:00+02:00`,
        endsAt: `2026-12-01T${to}:00+02:00`,
      }).expect(409);
    });

    it('compares instants, not local clock readings', async () => {
      await create().expect(201);

      // 08:30Z is 10:30+02:00
      await create({
        startsAt: '2026-12-01T08:30:00Z',
        endsAt: '2026-12-01T09:30:00Z',
      }).expect(409);
    });

    it('allows back-to-back appointments', async () => {
      await create().expect(201);

      await create({
        startsAt: '2026-12-01T09:00:00+02:00',
        endsAt: body.startsAt,
      }).expect(201);
      await create({
        startsAt: body.endsAt,
        endsAt: '2026-12-01T12:00:00+02:00',
      }).expect(201);
    });

    it('ignores cancelled appointments', async () => {
      await create().expect(201);
      await dataSource.query(`UPDATE appointments SET status = 'cancelled'`);

      await create().expect(201);
    });

    it('allows the same time for another master or another salon', async () => {
      await create().expect(201);

      await create({ masterId: 8 }).expect(201);
      await create({}, '2').expect(201);
    });

    it('creates exactly one of many simultaneous appointments', async () => {
      // Several rounds, because a race doesn't show up every time.
      for (let masterId = 1; masterId <= 10; masterId++) {
        const responses = await Promise.all(
          Array.from({ length: 10 }, () => create({ masterId })),
        );

        const statuses = responses
          .map((response) => response.status)
          .sort((a, b) => a - b);
        expect(statuses).toEqual([201, ...Array<number>(9).fill(409)]);
      }
    });
  });
});
