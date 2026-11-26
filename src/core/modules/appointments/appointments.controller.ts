import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { SalonId } from '../../decorators/salon-id.decorator.js';
import { AppointmentIdParamDto } from '../../dtos/appointment-id-param.dto.js';
import { CreateAppointmentDto } from '../../dtos/create-appointment.dto.js';
import { UpdateAppointmentStatusDto } from '../../dtos/update-appointment-status.dto.js';
import { AppointmentsService } from './appointments.service.js';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@SalonId() salonId: number, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(salonId, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @SalonId() salonId: number,
    @Param() params: AppointmentIdParamDto,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(
      salonId,
      params.id,
      dto.status,
    );
  }
}
