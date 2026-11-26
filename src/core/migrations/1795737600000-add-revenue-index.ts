import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRevenueIndex1795737600000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // The revenue report reads only done appointments of one salon in a time
    // range, so it doesn't have to scan the salon's whole history.
    await queryRunner.query(`
      CREATE INDEX appointments_revenue_idx
      ON appointments ("salonId", "startsAt")
      WHERE status = 'done'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX appointments_revenue_idx');
  }
}
