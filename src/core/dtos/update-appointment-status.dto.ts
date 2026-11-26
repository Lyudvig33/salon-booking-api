import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AppointmentStatus } from '../enums/appointment-status.enum.js';

export class UpdateAppointmentStatusDto {
  // "booked" is accepted here: it is a known status but a forbidden transition,
  // so the service answers 409 rather than 400.
  @ApiProperty({ enum: AppointmentStatus, example: AppointmentStatus.Done })
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;
}
