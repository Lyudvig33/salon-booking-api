import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateAppointmentDto } from '../../dtos/create-appointment.dto.js';
import { Appointment } from '../../entities/appointment.entity.js';

// PostgreSQL error code raised by an EXCLUDE constraint.
const EXCLUSION_VIOLATION = '23P01';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
  ) {}

  async create(
    salonId: number,
    dto: CreateAppointmentDto,
  ): Promise<Appointment> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    // Negated on purpose: this also rejects an Invalid Date.
    if (!(endsAt > startsAt)) {
      throw new BadRequestException('endsAt must be later than startsAt');
    }

    try {
      return await this.appointments.manager.transaction(async (manager) => {
        // Parallel inserts for one master queue here until the transaction ends.
        // Without it PostgreSQL may fail one of them with a deadlock, not 23P01.
        await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [
          salonId,
          dto.masterId,
        ]);
        return manager.save(Appointment, {
          salonId,
          masterId: dto.masterId,
          priceCents: dto.priceCents,
          startsAt,
          endsAt,
        });
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === EXCLUSION_VIOLATION
      ) {
        throw new ConflictException(
          'The master is already booked at this time',
        );
      }
      throw error;
    }
  }
}
