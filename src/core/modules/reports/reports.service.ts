import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../../entities/appointment.entity.js';
import { AppointmentStatus } from '../../enums/appointment-status.enum.js';
import { MasterRevenue } from '../../models/master-revenue.model.js';

// A month in the report starts and ends at midnight in the salon's time zone.
const SALON_TIME_ZONE = 'Europe/Kyiv';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
  ) {}

  /** @param month in the YYYY-MM format */
  async revenue(salonId: number, month: string): Promise<MasterRevenue[]> {
    // "local timestamp AT TIME ZONE zone" gives the instant at which clocks in
    // that zone show this time, with daylight saving time taken into account.
    // The month is added before the conversion, i.e. on the local calendar.
    const rows = await this.appointments.query<
      { masterId: number; revenueCents: string; count: string }[]
    >(
      `
      SELECT "masterId", SUM("priceCents") AS "revenueCents", COUNT(*) AS "count"
      FROM appointments
      WHERE "salonId" = $1
        AND status = $2
        AND "startsAt" >= $3::timestamp AT TIME ZONE $4
        AND "startsAt" < ($3::timestamp + interval '1 month') AT TIME ZONE $4
      GROUP BY "masterId"
      ORDER BY "masterId"
      `,
      [salonId, AppointmentStatus.Done, `${month}-01`, SALON_TIME_ZONE],
    );

    // SUM and COUNT are 64-bit in PostgreSQL, so the driver returns strings.
    return rows.map((row) => ({
      masterId: row.masterId,
      revenueCents: Number(row.revenueCents),
      count: Number(row.count),
    }));
  }
}
