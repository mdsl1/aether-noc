import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AlertService } from './alert.service';

@Module({
  imports: [HttpModule, DatabaseModule],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertsModule {}
