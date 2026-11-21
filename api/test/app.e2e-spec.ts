import * as http from 'node:http';
import { AddressInfo } from 'node:net';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, Model } from 'mongoose';
import request from 'supertest';
import { AlertService } from '../src/alerts/alert.service';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import {
  IconKey,
  TotemStatus,
  TotemType,
} from '../src/common/types/domain.types';
import {
  assertLocalMongoUri,
  isLocalMongoUri,
} from '../src/common/utils/mongo-uri.utils';
import {
  AuthState,
  AuthStateDocument,
} from '../src/database/schemas/auth-state.schema';
import { Island, IslandDocument } from '../src/database/schemas/island.schema';
import {
  TotemLog,
  TotemLogDocument,
} from '../src/database/schemas/totem-log.schema';
import {
  TotemState,
  TotemStateDocument,
} from '../src/database/schemas/totem-state.schema';
import {
  E2E_ADMIN_PASSWORD,
  E2E_ADMIN_USERNAME,
  E2E_INGEST_API_KEY,
} from './setup-e2e-env';

const TEST_ADMIN_USERNAME = E2E_ADMIN_USERNAME;
const TEST_ADMIN_PASSWORD = E2E_ADMIN_PASSWORD;
const TEST_INGEST_API_KEY = E2E_INGEST_API_KEY;

describe('A.E.T.H.E.R. API (e2e — MongoDB Local)', () => {
  let app: NestExpressApplication;
  let connection: Connection;
  let authStateModel: Model<AuthStateDocument>;
  let islandModel: Model<IslandDocument>;
  let totemStateModel: Model<TotemStateDocument>;
  let totemLogModel: Model<TotemLogDocument>;
  let accessToken: string;

  beforeAll(async () => {
    const localUri = assertLocalMongoUri(process.env.MONGO_TEST_URI);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AlertService)
      .useValue({ handleTotemUpdated: jest.fn().mockResolvedValue(undefined) })
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', 1);
    app.setGlobalPrefix('api', {
      exclude: [{ path: 'health', method: RequestMethod.GET }],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    connection = app.get<Connection>(getConnectionToken());
    if (
      !isLocalMongoUri(localUri) ||
      !['localhost', '127.0.0.1', '::1'].includes(connection.host)
    ) {
      throw new Error(
        `Conexão Mongoose não-local detectada nos testes: ${connection.host}`,
      );
    }

    authStateModel = app.get<Model<AuthStateDocument>>(
      getModelToken(AuthState.name),
    );
    islandModel = app.get<Model<IslandDocument>>(getModelToken(Island.name));
    totemStateModel = app.get<Model<TotemStateDocument>>(
      getModelToken(TotemState.name),
    );
    totemLogModel = app.get<Model<TotemLogDocument>>(
      getModelToken(TotemLog.name),
    );

    // Limpeza segura e seed mínimo para os testes de integração
    await Promise.all([
      authStateModel.deleteMany({}),
      islandModel.deleteMany({}),
      totemStateModel.deleteMany({}),
      totemLogModel.deleteMany({}),
    ]);

    await islandModel.create([
      {
        slug: 'core',
        name: 'Core',
        description: 'Infraestrutura principal da VM e motor n8n',
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
              expectedContainers: ['n8n', 'portfolio-api'],
              heartbeatTimeoutMinutes: 12,
              ramWarningPercent: 80,
              ramCriticalPercent: 90,
              diskWarningPercent: 80,
              diskCriticalPercent: 90,
            },
          },
          {
            totemId: 'portfolio-db',
            name: 'Banco Portfólio',
            type: TotemType.SUPABASE_HEALTH,
            iconKey: IconKey.DATABASE,
            checkIntervalMinutes: 20,
            enabled: true,
            config: {
              supabaseUrl: 'https://portfolio.supabase.local',
              supabaseKeyEnvRef: 'SUPABASE_PORTFOLIO_SERVICE_ROLE_KEY',
            },
          },
        ],
      },
      {
        slug: 'taco',
        name: 'T.A.C.O.',
        description: 'Orquestração de agentes IA',
        isCore: false,
        order: 1,
        totems: [
          {
            totemId: 'taco-orchestrator',
            name: 'Orquestrador T.A.C.O.',
            type: TotemType.N8N_WORKFLOW,
            iconKey: IconKey.AI_AGENT,
            checkIntervalMinutes: 5,
            enabled: true,
            config: {
              workflowId: 'wf-taco-1',
              tracksLlmTokens: true,
            },
          },
        ],
      },
    ]);

    await totemStateModel.create([
      {
        totemId: 'core-vm',
        islandSlug: 'core',
        status: TotemStatus.UNKNOWN,
        previousStatus: TotemStatus.UNKNOWN,
        statusReason: null,
        consecutiveFailures: 0,
        lastCheckAt: null,
        lastStatusChangeAt: null,
        lastAlertSentAt: null,
        alertActive: false,
        lastMetrics: null,
      },
      {
        totemId: 'portfolio-db',
        islandSlug: 'core',
        status: TotemStatus.HEALTHY,
        previousStatus: TotemStatus.HEALTHY,
        statusReason: null,
        consecutiveFailures: 0,
        lastCheckAt: new Date('2026-11-20T04:10:00.000Z'),
        lastStatusChangeAt: new Date('2026-11-20T04:00:00.000Z'),
        lastAlertSentAt: null,
        alertActive: false,
        lastMetrics: { statusCode: 200, latencyMs: 85, isReachable: true },
      },
      {
        totemId: 'taco-orchestrator',
        islandSlug: 'taco',
        status: TotemStatus.HEALTHY,
        previousStatus: TotemStatus.HEALTHY,
        statusReason: null,
        consecutiveFailures: 0,
        lastCheckAt: new Date('2026-11-20T04:10:00.000Z'),
        lastStatusChangeAt: new Date('2026-11-20T04:00:00.000Z'),
        lastAlertSentAt: null,
        alertActive: false,
        lastMetrics: {
          executionId: '9842',
          workflowActive: true,
          executionStatus: 'success',
          durationMs: 2100,
          tokenUsage: {
            promptTokens: 1000,
            completionTokens: 250,
            totalTokens: 1250,
          },
        },
      },
    ]);

    await totemLogModel.create([
      {
        totemId: 'taco-orchestrator',
        type: TotemType.N8N_WORKFLOW,
        status: TotemStatus.HEALTHY,
        timestamp: new Date('2026-11-20T04:10:00.000Z'),
        summary: null,
        metrics: {
          executionId: '9842',
          workflowActive: true,
          executionStatus: 'success',
          durationMs: 2100,
          tokenUsage: {
            promptTokens: 1000,
            completionTokens: 250,
            totalTokens: 1250,
          },
        },
      },
      {
        totemId: 'taco-orchestrator',
        type: TotemType.N8N_WORKFLOW,
        status: TotemStatus.HEALTHY,
        timestamp: new Date('2026-11-20T04:05:00.000Z'),
        summary: null,
        metrics: {
          executionId: '9841',
          workflowActive: true,
          executionStatus: 'success',
          durationMs: 1800,
          tokenUsage: {
            promptTokens: 500,
            completionTokens: 100,
            totalTokens: 600,
          },
        },
      },
    ]);

    // Faz login uma vez para reutilizar o JWT nos testes protegidos
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Forwarded-For', '10.10.0.1')
      .send({
        username: TEST_ADMIN_USERNAME,
        password: TEST_ADMIN_PASSWORD,
      })
      .expect(200);

    accessToken = (loginRes.body as { accessToken: string }).accessToken;
  }, 30_000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /health', () => {
    it('retorna 200 OK com database connected', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      const body = res.body as {
        status: string;
        database: string;
        uptime: number;
        timestamp: string;
      };

      expect(body.status).toBe('ok');
      expect(body.database).toBe('connected');
      expect(typeof body.uptime).toBe('number');
      expect(body.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });
  });

  describe('POST /api/auth/login', () => {
    it('rejeita campos extras com 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', '10.10.0.2')
        .send({
          username: TEST_ADMIN_USERNAME,
          password: TEST_ADMIN_PASSWORD,
          extraField: 'nao-permitido',
        })
        .expect(400);

      expect((res.body as { statusCode: number }).statusCode).toBe(400);
    });

    it('retorna 401 Unauthorized para credenciais inválidas', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', '10.10.0.3')
        .send({
          username: TEST_ADMIN_USERNAME,
          password: 'wrong-password',
        })
        .expect(401);

      expect((res.body as { message: string }).message).toBe(
        'Credenciais inválidas',
      );
    });

    it('retorna 429 Too Many Requests após exceder 5 tentativas por minuto', async () => {
      const rateLimitIp = '10.10.0.99';

      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .set('X-Forwarded-For', rateLimitIp)
          .send({
            username: TEST_ADMIN_USERNAME,
            password: 'wrong-password',
          })
          .expect(401);
      }

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', rateLimitIp)
        .send({
          username: TEST_ADMIN_USERNAME,
          password: 'wrong-password',
        })
        .expect(429);
    });
  });

  describe('POST /api/telemetry/heartbeat', () => {
    const validPayload = {
      totemId: 'core-vm',
      timestamp: '2026-11-20T04:15:00Z',
      metrics: {
        cpuLoad1m: 0.42,
        ramUsedMb: 1450,
        ramTotalMb: 4096,
        diskPercent: 48,
        containers: [
          { name: 'n8n', status: 'running' },
          { name: 'portfolio-api', status: 'running' },
        ],
      },
    };

    it('retorna 401 sem header x-api-key ou com chave inválida', async () => {
      await request(app.getHttpServer())
        .post('/api/telemetry/heartbeat')
        .send(validPayload)
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/telemetry/heartbeat')
        .set('x-api-key', 'invalid-key')
        .send(validPayload)
        .expect(401);
    });

    it('retorna 400 para DTO inválido ou campo extra', async () => {
      await request(app.getHttpServer())
        .post('/api/telemetry/heartbeat')
        .set('x-api-key', TEST_INGEST_API_KEY)
        .send({
          ...validPayload,
          metrics: {
            ...validPayload.metrics,
            diskPercent: 150, // > 100
          },
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/telemetry/heartbeat')
        .set('x-api-key', TEST_INGEST_API_KEY)
        .send({
          ...validPayload,
          injected: true,
        })
        .expect(400);
    });

    it('retorna 404 para totem inexistente ou não-vm_heartbeat', async () => {
      await request(app.getHttpServer())
        .post('/api/telemetry/heartbeat')
        .set('x-api-key', TEST_INGEST_API_KEY)
        .send({
          ...validPayload,
          totemId: 'nao-existe',
        })
        .expect(404);

      await request(app.getHttpServer())
        .post('/api/telemetry/heartbeat')
        .set('x-api-key', TEST_INGEST_API_KEY)
        .send({
          ...validPayload,
          totemId: 'portfolio-db',
        })
        .expect(404);
    });

    it('retorna 202 Accepted e persiste estado + log no MongoDB local', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/telemetry/heartbeat')
        .set('x-api-key', TEST_INGEST_API_KEY)
        .send(validPayload)
        .expect(202);

      const body = res.body as {
        received: boolean;
        totemId: string;
        evaluatedStatus: TotemStatus;
        serverTimestamp: string;
      };

      expect(body.received).toBe(true);
      expect(body.totemId).toBe('core-vm');
      expect(body.evaluatedStatus).toBe(TotemStatus.HEALTHY);

      const savedState = await totemStateModel
        .findOne({ totemId: 'core-vm' })
        .lean()
        .exec();
      expect(savedState?.status).toBe(TotemStatus.HEALTHY);
      expect(savedState?.lastMetrics?.ramUsedPercent).toBe(35.4);
    });
  });

  describe('GET /api/islands', () => {
    it('bloqueia acesso sem JWT com 401', async () => {
      await request(app.getHttpServer()).get('/api/islands').expect(401);
    });

    it('retorna topologia hidratada sem vazar config interno', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/islands')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = res.body as {
        generatedAt: string;
        summary: {
          totalTotems: number;
          healthy: number;
          warning: number;
          critical: number;
          unknown: number;
        };
        islands: Array<{
          slug: string;
          status: TotemStatus;
          totems: Array<Record<string, unknown>>;
        }>;
      };

      expect(body.summary.totalTotems).toBe(3);
      expect(body.summary.healthy).toBe(3);
      expect(body.islands).toHaveLength(2);

      for (const island of body.islands) {
        for (const totem of island.totems) {
          expect(totem).not.toHaveProperty('config');
          expect(totem).not.toHaveProperty('supabaseKeyEnvRef');
        }
      }
    });
  });

  describe('GET /api/totems/:totemId/logs & POST /api/totems/:totemId/check', () => {
    it('retorna histórico paginado com tokenSummary consolidado para workflow LLM', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/totems/taco-orchestrator/logs?page=1&limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = res.body as {
        totemId: string;
        type: TotemType;
        pagination: {
          page: number;
          limit: number;
          totalItems: number;
          totalPages: number;
          hasNextPage: boolean;
        };
        tokenSummary: {
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
        } | null;
        logs: Array<{ id: string; status: TotemStatus }>;
      };

      expect(body.totemId).toBe('taco-orchestrator');
      expect(body.pagination).toEqual({
        page: 1,
        limit: 1,
        totalItems: 2,
        totalPages: 2,
        hasNextPage: true,
      });
      expect(body.tokenSummary).toEqual({
        promptTokens: 1500,
        completionTokens: 350,
        totalTokens: 1850,
      });
      expect(body.logs).toHaveLength(1);
    });

    it('retorna 404 para logs de totem inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/totems/inexistente/logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('retorna 400 ao tentar Force Check em totem vm_heartbeat', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/totems/core-vm/check')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect((res.body as { message: string }).message).toContain(
        'vm_heartbeat',
      );
    });
  });

  describe('GET /api/stream (SSE)', () => {
    it('bloqueia acesso sem JWT com 401', async () => {
      await request(app.getHttpServer()).get('/api/stream').expect(401);
    });

    it('entrega headers anti-buffer e evento totem.updated em tempo real', async () => {
      await app.listen(0, '127.0.0.1');
      const address = app.getHttpServer().address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${address.port}`;

      const receivedChunk = await new Promise<{
        headers: http.IncomingHttpHeaders;
        body: string;
      }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          req.destroy();
          reject(new Error('Timeout aguardando evento SSE totem.updated'));
        }, 5000);

        const req = http.get(
          `${baseUrl}/api/stream`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'text/event-stream',
            },
          },
          (res) => {
            let buffer = '';

            res.on('data', (chunk: Buffer) => {
              buffer += chunk.toString('utf8');
              if (buffer.includes('event: totem.updated')) {
                clearTimeout(timeout);
                res.destroy();
                req.destroy();
                resolve({ headers: res.headers, body: buffer });
              }
            });
          },
        );

        // Dispara um heartbeat logo após abrir o stream para gerar o evento totem.updated
        setTimeout(() => {
          void request(baseUrl)
            .post('/api/telemetry/heartbeat')
            .set('x-api-key', TEST_INGEST_API_KEY)
            .set('X-Forwarded-For', '10.10.0.50')
            .send({
              totemId: 'core-vm',
              timestamp: '2026-11-20T04:20:00Z',
              metrics: {
                cpuLoad1m: 0.55,
                ramUsedMb: 1800,
                ramTotalMb: 4096,
                diskPercent: 50,
                containers: [
                  { name: 'n8n', status: 'running' },
                  { name: 'portfolio-api', status: 'running' },
                ],
              },
            })
            .then(() => undefined);
        }, 150);

        req.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      expect(receivedChunk.headers['content-type']).toContain(
        'text/event-stream',
      );
      expect(receivedChunk.headers['cache-control']).toContain('no-cache');
      expect(receivedChunk.headers['cache-control']).toContain('no-transform');
      expect(receivedChunk.headers['x-accel-buffering']).toBe('no');
      expect(receivedChunk.body).toContain('event: totem.updated');
      expect(receivedChunk.body).toContain('"totemId":"core-vm"');
      expect(receivedChunk.body).toContain('"islandSlug":"core"');
    });
  });

  describe('POST /api/auth/logout (revogação global de sessões)', () => {
    it('bloqueia acesso sem JWT com 401', async () => {
      await request(app.getHttpServer()).post('/api/auth/logout').expect(401);
    });

    it('revoga tokens anteriores globalmente e permite novo login imediatamente', async () => {
      const logoutRes = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const logoutBody = logoutRes.body as {
        revoked: boolean;
        revokedAt: string;
      };
      expect(logoutBody.revoked).toBe(true);
      expect(logoutBody.revokedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );

      // Token antigo deve ser rejeitado imediatamente após logout
      await request(app.getHttpServer())
        .get('/api/islands')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      // Novo login emite token com nova versão e volta a acessar rotas protegidas
      const reloginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', '10.10.0.77')
        .send({
          username: TEST_ADMIN_USERNAME,
          password: TEST_ADMIN_PASSWORD,
        })
        .expect(200);

      const freshToken = (reloginRes.body as { accessToken: string })
        .accessToken;
      await request(app.getHttpServer())
        .get('/api/islands')
        .set('Authorization', `Bearer ${freshToken}`)
        .expect(200);
    });
  });
});
