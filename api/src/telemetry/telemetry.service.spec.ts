import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model } from 'mongoose';
import {
  IconKey,
  TOTEM_UPDATED_EVENT,
  TotemStatus,
  TotemType,
} from '../common/types/domain.types';
import { Island, IslandDocument } from '../database/schemas/island.schema';
import { TotemLogDocument } from '../database/schemas/totem-log.schema';
import { TotemStateDocument } from '../database/schemas/totem-state.schema';
import { HttpPingChecker } from './checkers/http-ping.checker';
import { N8nWorkflowChecker } from './checkers/n8n-workflow.checker';
import { SupabaseHealthChecker } from './checkers/supabase-health.checker';
import { VmHeartbeatEvaluator } from './checkers/vm-heartbeat.evaluator';
import { TelemetryService } from './telemetry.service';

describe('TelemetryService', () => {
  let service: TelemetryService;
  let islandModelMock: {
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let totemStateModelMock: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
  };
  let totemLogModelMock: {
    create: jest.Mock;
    findOne: jest.Mock;
  };
  let eventEmitterMock: { emit: jest.Mock };
  let httpPingCheckerMock: { type: TotemType; check: jest.Mock };
  let supabaseCheckerMock: { type: TotemType; check: jest.Mock };
  let n8nCheckerMock: { type: TotemType; check: jest.Mock };

  const coreIsland: Island = {
    slug: 'core',
    name: 'Core',
    description: 'Core infra',
    isCore: true,
    order: 0,
    totems: [
      {
        totemId: 'core-vm',
        name: 'VM Principal',
        type: TotemType.VM_HEARTBEAT,
        iconKey: IconKey.SERVER,
        checkIntervalMinutes: 3,
        enabled: true,
        config: {
          expectedContainers: ['n8n'],
          heartbeatTimeoutMinutes: 12,
          ramWarningPercent: 80,
          ramCriticalPercent: 90,
          diskWarningPercent: 80,
          diskCriticalPercent: 90,
        },
      },
      {
        totemId: 'core-n8n',
        name: 'Motor n8n',
        type: TotemType.HTTP_PING,
        iconKey: IconKey.N8N,
        checkIntervalMinutes: 5,
        enabled: true,
        config: {
          targetUrl: 'https://n8n.local/healthz',
        },
      },
    ],
  };

  const makeStateDoc = (overrides: Record<string, unknown> = {}) => ({
    totemId: 'core-n8n',
    islandSlug: 'core',
    status: TotemStatus.UNKNOWN,
    previousStatus: TotemStatus.UNKNOWN,
    statusReason: null as string | null,
    consecutiveFailures: 0,
    lastCheckAt: null as Date | null,
    lastStatusChangeAt: null as Date | null,
    lastAlertSentAt: null as Date | null,
    alertActive: false,
    lastMetrics: null as Record<string, unknown> | null,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(() => {
    islandModelMock = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    totemStateModelMock = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };
    totemLogModelMock = {
      create: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
    };
    eventEmitterMock = { emit: jest.fn() };

    httpPingCheckerMock = {
      type: TotemType.HTTP_PING,
      check: jest.fn(),
    };
    supabaseCheckerMock = {
      type: TotemType.SUPABASE_HEALTH,
      check: jest.fn(),
    };
    n8nCheckerMock = {
      type: TotemType.N8N_WORKFLOW,
      check: jest.fn(),
    };

    service = new TelemetryService(
      islandModelMock as unknown as Model<IslandDocument>,
      totemStateModelMock as unknown as Model<TotemStateDocument>,
      totemLogModelMock as unknown as Model<TotemLogDocument>,
      eventEmitterMock as unknown as EventEmitter2,
      httpPingCheckerMock as unknown as HttpPingChecker,
      supabaseCheckerMock as unknown as SupabaseHealthChecker,
      n8nCheckerMock as unknown as N8nWorkflowChecker,
      new VmHeartbeatEvaluator(),
    );
  });

  it('bloqueia forceCheck para totem do tipo vm_heartbeat com BadRequestException', async () => {
    islandModelMock.findOne.mockReturnValue({
      lean: () => ({ exec: jest.fn().mockResolvedValue(coreIsland) }),
    });

    await expect(service.forceCheck('core-vm')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('aplica anti-flapping (1/2 warning -> 2/2 critical) e emite totem.updated', async () => {
    const state = makeStateDoc({ totemId: 'core-n8n' });

    islandModelMock.findOne.mockReturnValue({
      lean: () => ({ exec: jest.fn().mockResolvedValue(coreIsland) }),
    });
    totemStateModelMock.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(state),
    });
    totemStateModelMock.find.mockReturnValue({
      select: () => ({
        lean: () => ({
          exec: jest.fn().mockImplementation(() =>
            Promise.resolve([
              { totemId: 'core-vm', status: TotemStatus.HEALTHY },
              { totemId: 'core-n8n', status: state.status },
            ]),
          ),
        }),
      }),
    });

    // 1ª falha -> warning (1/2)
    httpPingCheckerMock.check.mockResolvedValueOnce({
      status: TotemStatus.WARNING,
      statusReason: 'Falha temporária (503) — 1/2',
      consecutiveFailures: 1,
      lastMetrics: { statusCode: 503, latencyMs: 120, isReachable: true },
      logsToInsert: [],
    });

    const firstResult = await service.forceCheck('core-n8n');
    expect(firstResult.status).toBe(TotemStatus.WARNING);
    expect(state.consecutiveFailures).toBe(1);

    // 2ª falha consecutiva -> critical
    httpPingCheckerMock.check.mockResolvedValueOnce({
      status: TotemStatus.CRITICAL,
      statusReason: 'Serviço indisponível (503)',
      consecutiveFailures: 2,
      lastMetrics: { statusCode: 503, latencyMs: 130, isReachable: true },
      logsToInsert: [],
    });

    const secondResult = await service.forceCheck('core-n8n');
    expect(secondResult.status).toBe(TotemStatus.CRITICAL);
    expect(state.consecutiveFailures).toBe(2);
    expect(eventEmitterMock.emit).toHaveBeenCalledTimes(2);
    const [lastEventName, lastPayload] = eventEmitterMock.emit.mock
      .calls[1] as [
      string,
      {
        islandSlug: string;
        islandStatus: TotemStatus;
        totem: { totemId: string; status: TotemStatus };
      },
    ];
    expect(lastEventName).toBe(TOTEM_UPDATED_EVENT);
    expect(lastPayload.islandSlug).toBe('core');
    expect(lastPayload.islandStatus).toBe(TotemStatus.CRITICAL);
    expect(lastPayload.totem.totemId).toBe('core-n8n');
    expect(lastPayload.totem.status).toBe(TotemStatus.CRITICAL);
  });

  it('aciona Dead Mans Switch quando VM fica > 12 min sem heartbeat', async () => {
    const now = new Date('2026-11-20T12:20:00.000Z');
    const staleCheck = new Date('2026-11-20T12:05:00.000Z');
    const vmState = makeStateDoc({
      totemId: 'core-vm',
      status: TotemStatus.HEALTHY,
      lastCheckAt: staleCheck,
    });

    totemStateModelMock.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(vmState),
    });
    totemStateModelMock.find.mockReturnValue({
      select: () => ({
        lean: () => ({
          exec: jest.fn().mockResolvedValue([
            { totemId: 'core-vm', status: TotemStatus.CRITICAL },
            { totemId: 'core-n8n', status: TotemStatus.HEALTHY },
          ]),
        }),
      }),
    });

    await service.checkVmDeadManSwitches([coreIsland], now);

    expect(vmState.status).toBe(TotemStatus.CRITICAL);
    expect(vmState.statusReason).toBe(
      'Heartbeat timeout (> 12 min sem resposta)',
    );
    expect(vmState.save).toHaveBeenCalledTimes(1);
    expect(totemLogModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        totemId: 'core-vm',
        type: TotemType.VM_HEARTBEAT,
        status: TotemStatus.CRITICAL,
      }),
    );
    expect(eventEmitterMock.emit).toHaveBeenCalledTimes(1);
    const [eventName, payload] = eventEmitterMock.emit.mock.calls[0] as [
      string,
      {
        islandSlug: string;
        islandStatus: TotemStatus;
        totem: { totemId: string; status: TotemStatus };
      },
    ];
    expect(eventName).toBe(TOTEM_UPDATED_EVENT);
    expect(payload.islandSlug).toBe('core');
    expect(payload.islandStatus).toBe(TotemStatus.CRITICAL);
    expect(payload.totem.totemId).toBe('core-vm');
    expect(payload.totem.status).toBe(TotemStatus.CRITICAL);
  });

  it('aplica throttling de 10 minutos na gravação de totem_logs para heartbeats healthy', async () => {
    const vmState = makeStateDoc({
      totemId: 'core-vm',
      status: TotemStatus.HEALTHY,
      lastCheckAt: new Date(Date.now() - 2 * 60 * 1000),
    });

    islandModelMock.findOne.mockReturnValue({
      lean: () => ({ exec: jest.fn().mockResolvedValue(coreIsland) }),
    });
    totemStateModelMock.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(vmState),
    });
    totemStateModelMock.find.mockReturnValue({
      select: () => ({
        lean: () => ({
          exec: jest
            .fn()
            .mockResolvedValue([
              { totemId: 'core-vm', status: TotemStatus.HEALTHY },
            ]),
        }),
      }),
    });

    // Último log foi há apenas 3 minutos (< 10 min) -> não deve gravar novo log
    totemLogModelMock.findOne.mockReturnValue({
      sort: () => ({
        select: () => ({
          lean: () => ({
            exec: jest.fn().mockResolvedValue({
              timestamp: new Date(Date.now() - 3 * 60 * 1000),
            }),
          }),
        }),
      }),
    });

    await service.ingestHeartbeat({
      totemId: 'core-vm',
      timestamp: new Date().toISOString(),
      metrics: {
        cpuLoad1m: 0.3,
        ramUsedMb: 1024,
        ramTotalMb: 4096,
        diskPercent: 40,
        containers: [{ name: 'n8n', status: 'running' }],
      },
    });

    expect(totemLogModelMock.create).not.toHaveBeenCalled();
    expect(eventEmitterMock.emit).toHaveBeenCalledTimes(1);
  });
});
