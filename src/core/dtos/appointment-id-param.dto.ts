import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { MAX_INT } from '../helpers/constants.js';

export class AppointmentIdParamDto {
  // URL parameters are strings, so convert before validating.
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT)
  id: number;
}
