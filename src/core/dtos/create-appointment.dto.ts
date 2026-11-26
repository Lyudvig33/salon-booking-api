import { IsInt, IsISO8601, IsRFC3339, Max, Min } from 'class-validator';
import { MAX_INT } from '../helpers/constants.js';

export class CreateAppointmentDto {
  @IsInt()
  @Min(1)
  @Max(MAX_INT)
  masterId: number;

  // RFC 3339 requires a time zone offset, strict ISO 8601 rejects e.g. Feb 30.
  @IsRFC3339()
  @IsISO8601({ strict: true })
  startsAt: string;

  @IsRFC3339()
  @IsISO8601({ strict: true })
  endsAt: string;

  @IsInt()
  @Min(0)
  @Max(MAX_INT)
  priceCents: number;
}
