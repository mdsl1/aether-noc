import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { HttpPingChecker } from './checkers/http-ping.checker';
import { N8nWorkflowChecker } from './checkers/n8n-workflow.checker';
import { SupabaseHealthChecker } from './checkers/supabase-health.checker';
import { VmHeartbeatEvaluator } from './checkers/vm-heartbeat.evaluator';
import { SchedulerService } from './scheduler.service';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';

@Module({
  imports: [DatabaseModule, AuthModule, HttpModule],
  controllers: [TelemetryController],
  providers: [
    HttpPingChecker,
    SupabaseHealthChecker,
    N8nWorkflowChecker,
    VmHeartbeatEvaluator,
    TelemetryService,
    SchedulerService,
  ],
  exports: [TelemetryService],
})
export class TelemetryModule {}
