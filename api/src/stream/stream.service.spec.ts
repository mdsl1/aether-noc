import { MessageEvent } from '@nestjs/common';
import {
  TOTEM_UPDATED_EVENT,
  TotemStatus,
  TotemUpdatedEvent,
} from '../common/types/domain.types';
import { StreamService } from './stream.service';

describe('StreamService', () => {
  let service: StreamService;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new StreamService();
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });

  it('emite evento totem.updated no formato exato do contrato SSE', () => {
    const received: MessageEvent[] = [];
    const subscription = service.createStream().subscribe((event) => {
      received.push(event);
    });

    const internalEvent: TotemUpdatedEvent = {
      islandSlug: 'core',
      islandName: 'Core',
      islandStatus: TotemStatus.HEALTHY,
      previousStatus: TotemStatus.UNKNOWN,
      totem: {
        totemId: 'core-vm',
        name: 'VM Principal',
        status: TotemStatus.HEALTHY,
        statusReason: null,
        lastCheckAt: '2026-11-20T04:15:01.120Z',
        lastStatusChangeAt: '2026-11-20T04:15:01.120Z',
        lastMetrics: { cpuLoad1m: 0.42 },
      },
    };

    service.handleTotemUpdated(internalEvent);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({
      type: TOTEM_UPDATED_EVENT,
      data: {
        islandSlug: 'core',
        islandStatus: TotemStatus.HEALTHY,
        totem: {
          totemId: 'core-vm',
          status: TotemStatus.HEALTHY,
          statusReason: null,
          lastCheckAt: '2026-11-20T04:15:01.120Z',
          lastStatusChangeAt: '2026-11-20T04:15:01.120Z',
          lastMetrics: { cpuLoad1m: 0.42 },
        },
      },
    });

    subscription.unsubscribe();
  });

  it('emite evento ping a cada 25 segundos com timestamp ISO UTC', () => {
    const received: MessageEvent[] = [];
    const subscription = service.createStream().subscribe((event) => {
      received.push(event);
    });

    jest.advanceTimersByTime(24_999);
    expect(received).toHaveLength(0);

    jest.advanceTimersByTime(1);
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('ping');
    const pingData = received[0].data as { timestamp: string };
    expect(pingData.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );

    jest.advanceTimersByTime(25_000);
    expect(received).toHaveLength(2);

    subscription.unsubscribe();
  });

  it('encerra conexões SSE abertas no logout e permite novas conexões após re-login', () => {
    let firstCompleted = false;
    const firstReceived: MessageEvent[] = [];

    service.createStream().subscribe({
      next: (event) => firstReceived.push(event),
      complete: () => {
        firstCompleted = true;
      },
    });

    service.handleAuthLogout();
    expect(firstCompleted).toBe(true);

    const secondReceived: MessageEvent[] = [];
    const secondSub = service.createStream().subscribe((event) => {
      secondReceived.push(event);
    });

    service.handleTotemUpdated({
      islandSlug: 'core',
      islandName: 'Core',
      islandStatus: TotemStatus.HEALTHY,
      previousStatus: TotemStatus.UNKNOWN,
      totem: {
        totemId: 'core-vm',
        name: 'VM Principal',
        status: TotemStatus.HEALTHY,
        statusReason: null,
        lastCheckAt: '2026-11-20T04:15:01.120Z',
        lastStatusChangeAt: '2026-11-20T04:15:01.120Z',
        lastMetrics: null,
      },
    });

    expect(firstReceived).toHaveLength(0);
    expect(secondReceived).toHaveLength(1);
    secondSub.unsubscribe();
  });

  it('completa o observable ao destruir o módulo', () => {
    let completed = false;
    service.createStream().subscribe({
      complete: () => {
        completed = true;
      },
    });

    service.onModuleDestroy();
    expect(completed).toBe(true);
  });
});
