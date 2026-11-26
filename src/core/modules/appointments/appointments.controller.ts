import { Body, Controller, Post } from '@nestjs/common';
import { SalonId } from '../../decorators/salon-id.decorator.js';
import { CreateAppointmentDto } from '../../dtos/create-appointment.dto.js';
import { AppointmentsService } from './appointments.service.js';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@SalonId() salonId: number, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(salonId, dto);
  }
}
