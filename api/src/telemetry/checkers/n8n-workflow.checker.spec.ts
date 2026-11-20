import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import {
  IconKey,
  TotemStatus,
  TotemType,
} from '../../common/types/domain.types';
import { TotemConfig } from '../../database/schemas/island.schema';
import { TotemState } from '../../database/schemas/totem-state.schema';
import { N8nWorkflowChecker } from './n8n-workflow.checker';

describe('N8nWorkflowChecker', () => {
  let checker: N8nWorkflowChecker;
  let httpGetMock: jest.Mock;

  const councilTotem: TotemConfig = {
    totemId: 'taco-council',
    name: 'Conselho',
    type: TotemType.N8N_WORKFLOW,
    iconKey: IconKey.AI_AGENT,
    checkIntervalMinutes: 10,
    enabled: true,
    config: {
      workflowId: 'wf-taco-council',
      tracksLlmTokens: true,
    },
  };

  const makeState = (overrides: Partial<TotemState> = {}): TotemState => ({
    totemId: 'taco-council',
    islandSlug: 'taco',
    status: TotemStatus.UNKNOWN,
    previousStatus: TotemStatus.UNKNOWN,
    statusReason: null,
    consecutiveFailures: 0,
    lastCheckAt: null,
    lastStatusChangeAt: null,
    lastAlertSentAt: null,
    alertActive: false,
    lastMetrics: null,
    ...overrides,
  });

  beforeEach(() => {
    httpGetMock = jest.fn();
    const httpService = { get: httpGetMock } as unknown as HttpService;
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'N8N_BASE_URL') return 'https://n8n.test.local';
        if (key === 'N8N_API_KEY') return 'test-n8n-key';
        throw new Error(`Unexpected key ${key}`);
      }),
    } as unknown as ConfigService;

    checker = new N8nWorkflowChecker(httpService, configService);
  });

  it('recupera para healthy quando workflow está ativo com data: [] após falha anterior da API do n8n', async () => {
    httpGetMock
      .mockReturnValueOnce(
        of({ data: { id: 'wf-taco-council', active: true } }),
      )
      .mockReturnValueOnce(of({ data: { data: [], nextCursor: null } }));

    const result = await checker.check(
      councilTotem,
      makeState({
        status: TotemStatus.CRITICAL,
        statusReason: 'API do n8n inacessível',
        consecutiveFailures: 2,
      }),
    );

    expect(result.status).toBe(TotemStatus.HEALTHY);
    expect(result.statusReason).toBeNull();
    expect(result.consecutiveFailures).toBe(0);
    expect(result.lastMetrics).toEqual({ workflowActive: true });
  });

  it('recupera para healthy quando workflow é reativado com data: []', async () => {
    httpGetMock
      .mockReturnValueOnce(
        of({ data: { id: 'wf-taco-council', active: true } }),
      )
      .mockReturnValueOnce(of({ data: { data: [], nextCursor: null } }));

    const result = await checker.check(
      councilTotem,
      makeState({
        status: TotemStatus.WARNING,
        statusReason: 'Workflow desativado no n8n',
        consecutiveFailures: 0,
      }),
    );

    expect(result.status).toBe(TotemStatus.HEALTHY);
    expect(result.statusReason).toBeNull();
  });
});
