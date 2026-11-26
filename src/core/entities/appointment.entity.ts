import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AppointmentStatus } from '../enums/appointment-status.enum.js';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  salonId: number;

  @Column({ type: 'integer' })
  masterId: number;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({ type: 'integer' })
  priceCents: number;

  @Column({ type: 'text', default: AppointmentStatus.Booked })
  status: AppointmentStatus;
}
