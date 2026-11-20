import * as os from 'node:os';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AlertsModule } from './alerts/alerts.module';
import { AuthModule } from './auth/auth.module';
import { assertLocalMongoUri } from './common/utils/mongo-uri.utils';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { IslandsModule } from './islands/islands.module';
import { StreamModule } from './stream/stream.module';
import { TelemetryModule } from './telemetry/telemetry.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'test',
      validationSchema: envValidationSchema,
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isTest = configService.get<string>('NODE_ENV') === 'test';
        const uri = isTest
          ? assertLocalMongoUri(configService.get<string>('MONGO_TEST_URI'))
          : configService.getOrThrow<string>('MONGO_URI');

        return {
          uri,
          ...(isTest
            ? {
                serverSelectionTimeoutMS: 5000,
                retryAttempts: 1,
                // Evita dynamic import('os') no handshake do driver mongodb v7.6+ dentro do Jest
                runtimeAdapters: { os },
              }
            : {}),
        };
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    DatabaseModule,
    HealthModule,
    AuthModule,
    TelemetryModule,
    IslandsModule,
    StreamModule,
    AlertsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
