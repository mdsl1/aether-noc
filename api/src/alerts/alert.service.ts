import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { TOTEM_UPDATED_EVENT, TotemStatus } from '../common/types/domain.types';
import type { TotemUpdatedEvent } from '../common/types/domain.types';
import {
  TotemState,
  TotemStateDocument,
} from '../database/schemas/totem-state.schema';

export const ALERT_COOLDOWN_MS = 15 * 60 * 1000;
const TELEGRAM_TIMEOUT_MS = 8000;

export function formatSaoPauloDateTime(date: Date): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  const day = byType.get('day') ?? '00';
  const month = byType.get('month') ?? '00';
  const year = byType.get('year') ?? '0000';
  const hour = byType.get('hour') ?? '00';
  const minute = byType.get('minute') ?? '00';

  return `${day}/${month}/${year} ${hour}:${minute}`;
}

export function escapeTelegramMarkdown(text: string): string {
  return text.replace(/([_*`[])/g, '\\$1');
}

export function sanitizeTelegramErrorMessage(message: string): string {
  return message.replace(/bot\d+:[A-Za-z0-9_-]+/gi, 'bot<REDACTED>');
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    @InjectModel(TotemState.name)
    private readonly totemStateModel: Model<TotemStateDocument>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent(TOTEM_UPDATED_EVENT)
  async handleTotemUpdated(
    event: TotemUpdatedEvent,
    now: Date = new Date(),
  ): Promise<void> {
    const newStatus = event.totem.status;

    if (
      newStatus !== TotemStatus.CRITICAL &&
      newStatus !== TotemStatus.HEALTHY
    ) {
      return;
    }

    const state = await this.totemStateModel
      .findOne({ totemId: event.totem.totemId })
      .exec();

    if (!state) {
      return;
    }

    if (newStatus === TotemStatus.CRITICAL) {
      await this.handleCriticalState(event, state, now);
      return;
    }

    if (newStatus === TotemStatus.HEALTHY && state.alertActive) {
      await this.handleRecoveryState(event, state, now);
    }
  }

  private async handleCriticalState(
    event: TotemUpdatedEvent,
    state: TotemStateDocument,
    now: Date,
  ): Promise<void> {
    const lastAlertAt = state.lastAlertSentAt
      ? new Date(state.lastAlertSentAt)
      : null;

    const cooldownElapsed =
      lastAlertAt === null ||
      now.getTime() - lastAlertAt.getTime() >= ALERT_COOLDOWN_MS;

    const shouldSendAlert = !state.alertActive || cooldownElapsed;

    if (!shouldSendAlert) {
      this.logger.debug(
        `Alerta suprimido por cooldown de 15 min para totem '${event.totem.totemId}'`,
      );
      return;
    }

    const reason =
      event.totem.statusReason ??
      'Falha crítica detectada sem detalhe adicional';
    const text = [
      '🚨 *[A.E.T.H.E.R.] ALERTA CRÍTICO*',
      '',
      `*Ilha:* ${escapeTelegramMarkdown(event.islandName)}`,
      `*Totem:* ${escapeTelegramMarkdown(event.totem.name)}`,
      `*Motivo:* ${escapeTelegramMarkdown(reason)}`,
      `*Horário:* ${formatSaoPauloDateTime(now)}`,
    ].join('\n');

    const sent = await this.sendTelegramMessage(text, event.totem.totemId);
    if (!sent) {
      return;
    }

    state.alertActive = true;
    state.lastAlertSentAt = now;
    await state.save();
  }

  private async handleRecoveryState(
    event: TotemUpdatedEvent,
    state: TotemStateDocument,
    now: Date,
  ): Promise<void> {
    const text = [
      '✅ *[A.E.T.H.E.R.] RECUPERADO*',
      '',
      `*Ilha:* ${escapeTelegramMarkdown(event.islandName)}`,
      `*Totem:* ${escapeTelegramMarkdown(event.totem.name)}`,
      '*Status:* Operacional',
      `*Horário:* ${formatSaoPauloDateTime(now)}`,
    ].join('\n');

    const sent = await this.sendTelegramMessage(text, event.totem.totemId);
    if (!sent) {
      return;
    }

    state.alertActive = false;
    await state.save();
  }

  private async sendTelegramMessage(
    text: string,
    totemId: string,
  ): Promise<boolean> {
    const botToken =
      this.configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    const chatId = this.configService.getOrThrow<string>('TELEGRAM_CHAT_ID');
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
      await firstValueFrom(
        this.httpService.post(
          url,
          {
            chat_id: chatId,
            parse_mode: 'Markdown',
            text,
          },
          { timeout: TELEGRAM_TIMEOUT_MS },
        ),
      );
      return true;
    } catch (error: unknown) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      const message = sanitizeTelegramErrorMessage(rawMessage);
      this.logger.error(
        `Falha ao enviar alerta Telegram para totem '${totemId}': ${message}`,
      );
      return false;
    }
  }
}
