import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { CreateAppointmentDto } from '../../dtos/create-appointment.dto.js';
import { Appointment } from '../../entities/appointment.entity.js';
import { AppointmentStatus } from '../../enums/appointment-status.enum.js';

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
        await this.lockMaster(manager, salonId, dto.masterId);
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

  /** The only allowed transitions are booked -> done and booked -> cancelled. */
  async updateStatus(
    salonId: number,
    id: number,
    status: AppointmentStatus,
  ): Promise<Appointment> {
    return this.appointments.manager.transaction(async (manager) => {
      // Searching by salonId too: another salon's appointment is "not found".
      const appointment = await manager.findOneBy(Appointment, { id, salonId });
      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }
      // An update re-checks the exclusion constraint, so it needs the lock too.
      await this.lockMaster(manager, salonId, appointment.masterId);

      if (status !== AppointmentStatus.Booked) {
        // "status = booked" is part of the UPDATE itself, so of two
        // simultaneous requests only one can change the appointment.
        const { affected } = await manager.update(
          Appointment,
          { id, salonId, status: AppointmentStatus.Booked },
          { status },
        );
        if (affected) {
          appointment.status = status;
          return appointment;
        }
      }
      throw new ConflictException('This status change is not allowed');
    });
  }

  /**
   * Makes writes for one master wait for each other until the transaction ends.
   * Without it, simultaneous writes can fail with a deadlock (500) in PostgreSQL.
   */
  private async lockMaster(
    manager: EntityManager,
    salonId: number,
    masterId: number,
  ): Promise<void> {
    await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [
      salonId,
      masterId,
    ]);
  }
}
