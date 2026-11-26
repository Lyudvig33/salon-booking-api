import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from '../config/typeorm.config.js';
import { validationPipe } from '../validation/validation.pipe.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { ReportsModule } from './reports/reports.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: typeOrmConfig,
    }),
    AppointmentsModule,
    ReportsModule,
  ],
  // Registered here (not in main.ts) so that tests get the same validation.
  providers: [{ provide: APP_PIPE, useValue: validationPipe }],
})
export class CoreModule {}
