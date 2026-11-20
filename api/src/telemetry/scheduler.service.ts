import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TelemetryService } from './telemetry.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private isRunning = false;

  constructor(private readonly telemetryService: TelemetryService) {}

  @Cron('* * * * *')
  async handleMinutelyChecks(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'Ciclo anterior do agendador ainda em execução; pulando tick atual.',
      );
      return;
    }

    this.isRunning = true;
    try {
      await this.telemetryService.runScheduledChecks();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro no ciclo do agendador: ${message}`);
    } finally {
      this.isRunning = false;
    }
  }
}
