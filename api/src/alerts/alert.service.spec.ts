import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { of, throwError } from 'rxjs';
import { TotemStatus, TotemUpdatedEvent } from '../common/types/domain.types';
import { TotemStateDocument } from '../database/schemas/totem-state.schema';
import {
  ALERT_COOLDOWN_MS,
  AlertService,
  formatSaoPauloDateTime,
  sanitizeTelegramErrorMessage,
} from './alert.service';

describe('AlertService', () => {
  let service: AlertService;
  let httpPostMock: jest.Mock;
  let findOneExecMock: jest.Mock;

  const createStateMock = (overrides: Partial<TotemStateDocument> = {}) => {
    const state = {
      totemId: 'core-vm',
      islandSlug: 'core',
      status: TotemStatus.CRITICAL,
      previousStatus: TotemStatus.HEALTHY,
      statusReason: 'Heartbeat timeout (> 12 min sem resposta)',
      alertActive: false,
      lastAlertSentAt: null as Date | null,
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
    return state;
  };

  const createEvent = (
    status: TotemStatus,
    statusReason: string | null = null,
  ): TotemUpdatedEvent => ({
    islandSlug: 'core',
    islandName: 'Core',
    islandStatus: status,
    previousStatus: TotemStatus.HEALTHY,
    totem: {
      totemId: 'core-vm',
      name: 'VM Principal',
      status,
      statusReason,
      lastCheckAt: '2026-11-18T01:18:00.000Z',
      lastStatusChangeAt: '2026-11-18T01:18:00.000Z',
      lastMetrics: null,
    },
  });

  beforeEach(() => {
    httpPostMock = jest
      .fn()
      .mockReturnValue(of({ status: 200, data: { ok: true } }));
    findOneExecMock = jest.fn();

    const totemStateModel = {
      findOne: jest.fn().mockReturnValue({ exec: findOneExecMock }),
    } as unknown as Model<TotemStateDocument>;

    const httpService = {
      post: httpPostMock,
    } as unknown as HttpService;

    const configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'TELEGRAM_BOT_TOKEN') return '123456:TEST_TOKEN';
        if (key === 'TELEGRAM_CHAT_ID') return '987654321';
        throw new Error(`Unexpected key: ${key}`);
      }),
    } as unknown as ConfigService;

    service = new AlertService(totemStateModel, httpService, configService);
  });

  it('formata datas UTC corretamente para America/Sao_Paulo (DD/MM/YYYY HH:mm)', () => {
    // 2026-11-18T01:18:00.000Z em UTC-3 => 17/11/2026 22:18
    const formatted = formatSaoPauloDateTime(
      new Date('2026-11-18T01:18:00.000Z'),
    );
    expect(formatted).toBe('17/11/2026 22:18');
  });

  it('dispara ALERTA CRÍTICO no Telegram quando totem entra em critical', async () => {
    const state = createStateMock({
      alertActive: false,
      lastAlertSentAt: null,
    });
    findOneExecMock.mockResolvedValue(state);

    const now = new Date('2026-11-18T01:18:00.000Z');
    await service.handleTotemUpdated(
      createEvent(
        TotemStatus.CRITICAL,
        'Heartbeat timeout (> 12 min sem resposta)',
      ),
      now,
    );

    expect(httpPostMock).toHaveBeenCalledTimes(1);
    const [url, body] = httpPostMock.mock.calls[0] as [
      string,
      { chat_id: string; parse_mode: string; text: string },
    ];
    expect(url).toBe(
      'https://api.telegram.org/bot123456:TEST_TOKEN/sendMessage',
    );
    expect(body.chat_id).toBe('987654321');
    expect(body.parse_mode).toBe('Markdown');
    expect(body.text).toContain('🚨 *[A.E.T.H.E.R.] ALERTA CRÍTICO*');
    expect(body.text).toContain('*Ilha:* Core');
    expect(body.text).toContain('*Totem:* VM Principal');
    expect(body.text).toContain('Heartbeat timeout (> 12 min sem resposta)');
    expect(body.text).toContain('17/11/2026 22:18');

    expect(state.alertActive).toBe(true);
    expect(state.lastAlertSentAt).toEqual(now);
    expect(state.save).toHaveBeenCalledTimes(1);
  });

  it('suprime novo alerta crítico durante o cooldown de 15 minutos', async () => {
    const lastAlert = new Date('2026-11-18T01:00:00.000Z');
    const withinCooldown = new Date(
      lastAlert.getTime() + ALERT_COOLDOWN_MS - 1000,
    );
    const state = createStateMock({
      alertActive: true,
      lastAlertSentAt: lastAlert,
    });
    findOneExecMock.mockResolvedValue(state);

    await service.handleTotemUpdated(
      createEvent(TotemStatus.CRITICAL, 'Ainda fora do ar'),
      withinCooldown,
    );

    expect(httpPostMock).not.toHaveBeenCalled();
    expect(state.save).not.toHaveBeenCalled();
  });

  it('reenvia alerta crítico após expirar o cooldown de 15 minutos', async () => {
    const lastAlert = new Date('2026-11-18T01:00:00.000Z');
    const afterCooldown = new Date(lastAlert.getTime() + ALERT_COOLDOWN_MS);
    const state = createStateMock({
      alertActive: true,
      lastAlertSentAt: lastAlert,
    });
    findOneExecMock.mockResolvedValue(state);

    await service.handleTotemUpdated(
      createEvent(TotemStatus.CRITICAL, 'Continua indisponível'),
      afterCooldown,
    );

    expect(httpPostMock).toHaveBeenCalledTimes(1);
    expect(state.lastAlertSentAt).toEqual(afterCooldown);
    expect(state.save).toHaveBeenCalledTimes(1);
  });

  it('dispara RECUPERADO imediatamente ao voltar para healthy mesmo dentro do cooldown', async () => {
    const lastAlert = new Date('2026-11-18T01:10:00.000Z');
    const recoveryNow = new Date('2026-11-18T01:12:00.000Z');
    const state = createStateMock({
      alertActive: true,
      lastAlertSentAt: lastAlert,
    });
    findOneExecMock.mockResolvedValue(state);

    await service.handleTotemUpdated(
      createEvent(TotemStatus.HEALTHY, null),
      recoveryNow,
    );

    expect(httpPostMock).toHaveBeenCalledTimes(1);
    const [, body] = httpPostMock.mock.calls[0] as [string, { text: string }];
    expect(body.text).toContain('✅ *[A.E.T.H.E.R.] RECUPERADO*');
    expect(body.text).toContain('*Ilha:* Core');
    expect(body.text).toContain('*Totem:* VM Principal');
    expect(body.text).toContain('17/11/2026 22:12');

    expect(state.alertActive).toBe(false);
    expect(state.save).toHaveBeenCalledTimes(1);
  });

  it('não envia alerta para warning, unknown ou healthy sem incidente ativo', async () => {
    const state = createStateMock({ alertActive: false });
    findOneExecMock.mockResolvedValue(state);

    await service.handleTotemUpdated(
      createEvent(TotemStatus.WARNING, 'Latência elevada'),
    );
    await service.handleTotemUpdated(createEvent(TotemStatus.UNKNOWN, null));
    await service.handleTotemUpdated(createEvent(TotemStatus.HEALTHY, null));

    expect(httpPostMock).not.toHaveBeenCalled();
    expect(state.save).not.toHaveBeenCalled();
  });

  it('não propaga erro nem marca alertActive quando Telegram API falha', async () => {
    httpPostMock.mockReturnValue(
      throwError(() => new Error('Telegram network timeout')),
    );
    const state = createStateMock({
      alertActive: false,
      lastAlertSentAt: null,
    });
    findOneExecMock.mockResolvedValue(state);

    await expect(
      service.handleTotemUpdated(
        createEvent(TotemStatus.CRITICAL, 'Erro crítico'),
      ),
    ).resolves.toBeUndefined();

    expect(state.alertActive).toBe(false);
    expect(state.lastAlertSentAt).toBeNull();
    expect(state.save).not.toHaveBeenCalled();
  });

  it('mascara o token do bot Telegram ao logar falhas de envio', async () => {
    expect(
      sanitizeTelegramErrorMessage(
        'Request failed for https://api.telegram.org/bot123456:TEST_TOKEN/sendMessage',
      ),
    ).toBe(
      'Request failed for https://api.telegram.org/bot<REDACTED>/sendMessage',
    );

    const loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    httpPostMock.mockReturnValue(
      throwError(
        () =>
          new Error(
            'connect ETIMEDOUT https://api.telegram.org/bot123456:TEST_TOKEN/sendMessage',
          ),
      ),
    );

    const state = createStateMock({ alertActive: false });
    findOneExecMock.mockResolvedValue(state);

    await service.handleTotemUpdated(
      createEvent(TotemStatus.CRITICAL, 'Erro crítico'),
    );

    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    const loggedMessage = String(loggerErrorSpy.mock.calls[0]?.[0]);
    expect(loggedMessage).toContain('bot<REDACTED>');
    expect(loggedMessage).not.toContain('123456:TEST_TOKEN');

    loggerErrorSpy.mockRestore();
  });
});
