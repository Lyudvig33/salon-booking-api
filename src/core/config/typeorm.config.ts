import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CreateAppointments1795651200000 } from '../migrations/1795651200000-create-appointments.js';

export function typeOrmConfig(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: config.get<string>(
      'DATABASE_URL',
      'postgres://postgres:postgres@localhost:5433/salon',
    ),
    autoLoadEntities: true,
    // The schema is managed only by migrations, applied on application start.
    migrations: [CreateAppointments1795651200000],
    migrationsRun: true,
  };
}
