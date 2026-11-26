import { ApiProperty } from '@nestjs/swagger';

/** One row of the revenue report. A class, so that Swagger can describe it. */
export class MasterRevenue {
  @ApiProperty({ example: 5 })
  masterId: number;

  @ApiProperty({ example: 4500 })
  revenueCents: number;

  @ApiProperty({ example: 3 })
  count: number;
}
