import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { SalonId } from '../../decorators/salon-id.decorator.js';
import { RevenueQueryDto } from '../../dtos/revenue-query.dto.js';
import { MasterRevenue } from '../../models/master-revenue.model.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  @ApiOkResponse({ type: [MasterRevenue] })
  revenue(
    @SalonId() salonId: number,
    @Query() query: RevenueQueryDto,
  ): Promise<MasterRevenue[]> {
    return this.reportsService.revenue(salonId, query.month);
  }
}
