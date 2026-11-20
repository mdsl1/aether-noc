import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { IslandsController } from './islands.controller';
import { IslandsService } from './islands.service';
import { TotemsController } from './totems.controller';

@Module({
  imports: [DatabaseModule, AuthModule, TelemetryModule],
  controllers: [IslandsController, TotemsController],
  providers: [IslandsService],
  exports: [IslandsService],
})
export class IslandsModule {}
