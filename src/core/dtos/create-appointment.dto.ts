import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsISO8601, IsRFC3339, Max, Min } from 'class-validator';
import { MAX_INT } from '../helpers/constants.js';

export class CreateAppointmentDto {
  @ApiProperty({ example: 7 })
  @IsInt()
  @Min(1)
  @Max(MAX_INT)
  masterId: number;

  // RFC 3339 requires a time zone offset, strict ISO 8601 rejects e.g. Feb 30.
  @ApiProperty({ example: '2026-12-01T10:00:00+02:00' })
  @IsRFC3339()
  @IsISO8601({ strict: true })
  startsAt: string;

  @ApiProperty({ example: '2026-12-01T11:00:00+02:00' })
  @IsRFC3339()
  @IsISO8601({ strict: true })
  endsAt: string;

  @ApiProperty({ example: 3000 })
  @IsInt()
  @Min(0)
  @Max(MAX_INT)
  priceCents: number;
}
