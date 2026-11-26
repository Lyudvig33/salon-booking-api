import { IsEnum } from 'class-validator';
import { AppointmentStatus } from '../enums/appointment-status.enum.js';

export class UpdateAppointmentStatusDto {
  // "booked" is accepted here: it is a known status but a forbidden transition,
  // so the service answers 409 rather than 400.
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;
}
