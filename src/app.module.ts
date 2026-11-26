import { Module } from '@nestjs/common';
import { CoreModule } from './core/modules/index.js';

@Module({
  imports: [CoreModule],
})
export class AppModule {}
