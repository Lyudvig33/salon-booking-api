import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class RevenueQueryDto {
  @ApiProperty({ example: '2026-10' })
  @Matches(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in the YYYY-MM format',
  })
  month: string;
}
