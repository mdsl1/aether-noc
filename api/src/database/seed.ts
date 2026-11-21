import 'dotenv/config';
import mongoose from 'mongoose';
import { IconKey, TotemStatus, TotemType } from '../common/types/domain.types';
import { isLocalMongoUri } from '../common/utils/mongo-uri.utils';
import { AuthState, AuthStateSchema } from './schemas/auth-state.schema';
import { Island, IslandSchema } from './schemas/island.schema';
import { TotemState, TotemStateSchema } from './schemas/totem-state.schema';
import { TotemLog, TotemLogSchema } from './schemas/totem-log.schema';

function resolveSeedEnv(
  name: string,
  localFallback: string,
  isLocal: boolean,
): string {
  const value = process.env[name]?.trim();
  if (value) {
    return value;
  }
  if (isLocal) {
    return localFallback;
  }
  throw new Error(
    `Variável de ambiente obrigatória para o seed não definida: ${name}`,
  );
}

function resolveSeedListEnv(
  name: string,
  localFallback: string[],
  isLocal: boolean,
): string[] {
  const raw = process.env[name]?.trim();
  if (raw) {
    const items = raw
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    if (items.length > 0) {
      return items;
    }
  }
  if (isLocal) {
    return localFallback;
  }
  throw new Error(
    `Variável de ambiente obrigatória para o seed não definida: ${name}`,
  );
}

function buildSeedIslands(isLocal: boolean): Island[] {
  const n8nBaseUrl = resolveSeedEnv(
    'N8N_BASE_URL',
    'https://n8n.exemplo.com',
    isLocal,
  ).replace(/\/+$/, '');
  const supabasePortfolioUrl = resolveSeedEnv(
    'SUPABASE_PORTFOLIO_URL',
    'https://seu-projeto-web.supabase.co',
    isLocal,
  ).replace(/\/+$/, '');
  const supabaseN8nUrl = resolveSeedEnv(
    'SUPABASE_N8N_URL',
    'https://seu-projeto-automacao.supabase.co',
    isLocal,
  ).replace(/\/+$/, '');
  const expectedContainers = resolveSeedListEnv(
    'SEED_VM_EXPECTED_CONTAINERS',
    ['n8n', 'api-app'],
    isLocal,
  );
  const portfolioWebUrl = resolveSeedEnv(
    'SEED_PORTFOLIO_WEB_URL',
    'https://portfolio.exemplo.com',
    isLocal,
  );
  const portfolioApiUrl = resolveSeedEnv(
    'SEED_PORTFOLIO_API_URL',
    'https://api.portfolio.exemplo.com/health',
    isLocal,
  );
  const wfPortfolioContact = resolveSeedEnv(
    'SEED_WF_PORTFOLIO_CONTACT',
    'wf-portfolio-contact',
    isLocal,
  );
  const wfTacoOrchestrator = resolveSeedEnv(
    'SEED_WF_TACO_ORCHESTRATOR',
    'wf-taco-orchestrator',
    isLocal,
  );
  const wfTacoFinance = resolveSeedEnv(
    'SEED_WF_TACO_FINANCE',
    'wf-taco-finance',
    isLocal,
  );
  const wfTacoCouncil = resolveSeedEnv(
    'SEED_WF_TACO_COUNCIL',
    'wf-taco-council',
    isLocal,
  );
  const wfOpsSupabaseKeepalive = resolveSeedEnv(
    'SEED_WF_OPS_SUPABASE_KEEPALIVE',
    'wf-ops-supabase-keepalive',
    isLocal,
  );
  const wfOpsN8nBackup = resolveSeedEnv(
    'SEED_WF_OPS_N8N_BACKUP',
    'wf-ops-n8n-backup',
    isLocal,
  );

  return [
    {
      slug: 'core',
      name: 'Core',
      description: 'Infraestrutura principal da VM e motor n8n',
      isCore: true,
      order: 0,
      totems: [
        {
          totemId: 'core-vm',
          name: 'Core VM',
          type: TotemType.VM_HEARTBEAT,
          iconKey: IconKey.SERVER,
          checkIntervalMinutes: 3,
          enabled: true,
          config: {
            expectedContainers,
            heartbeatTimeoutMinutes: 12,
            ramWarningPercent: 80,
            ramCriticalPercent: 90,
            diskWarningPercent: 80,
            diskCriticalPercent: 90,
          },
        },
        {
          totemId: 'core-n8n',
          name: 'Core n8n',
          type: TotemType.HTTP_PING,
          iconKey: IconKey.N8N,
          checkIntervalMinutes: 5,
          enabled: true,
          config: {
            targetUrl: `${n8nBaseUrl}/healthz`,
            expectedStatusMin: 200,
            expectedStatusMax: 299,
            warningLatencyMs: 3000,
          },
        },
      ],
    },
    {
      slug: 'portfolio',
      name: 'Portfolio',
      description: 'Aplicação web, API, contato via n8n e banco Supabase',
      isCore: false,
      order: 1,
      totems: [
        {
          totemId: 'portfolio-web',
          name: 'Site Web',
          type: TotemType.HTTP_PING,
          iconKey: IconKey.GLOBE,
          checkIntervalMinutes: 20,
          enabled: true,
          config: {
            targetUrl: portfolioWebUrl,
            expectedStatusMin: 200,
            expectedStatusMax: 299,
            warningLatencyMs: 3000,
          },
        },
        {
          totemId: 'portfolio-api',
          name: 'API REST',
          type: TotemType.HTTP_PING,
          iconKey: IconKey.API,
          checkIntervalMinutes: 15,
          enabled: true,
          config: {
            targetUrl: portfolioApiUrl,
            expectedStatusMin: 200,
            expectedStatusMax: 299,
            warningLatencyMs: 3000,
          },
        },
        {
          totemId: 'portfolio-n8n-contact',
          name: '[n8n] Notif. Contato',
          type: TotemType.N8N_WORKFLOW,
          iconKey: IconKey.N8N,
          checkIntervalMinutes: 15,
          enabled: true,
          config: {
            workflowId: wfPortfolioContact,
            tracksLlmTokens: false,
          },
        },
        {
          totemId: 'portfolio-db',
          name: 'Portfolio DB',
          type: TotemType.SUPABASE_HEALTH,
          iconKey: IconKey.DATABASE,
          checkIntervalMinutes: 20,
          enabled: true,
          config: {
            supabaseUrl: supabasePortfolioUrl,
            supabaseKeyEnvRef: 'SUPABASE_PORTFOLIO_SERVICE_ROLE_KEY',
          },
        },
      ],
    },
    {
      slug: 'taco',
      name: 'T.A.C.O.',
      description: 'Orquestrador multi-agente de IA e banco de dados',
      isCore: false,
      order: 2,
      totems: [
        {
          totemId: 'taco-orchestrator',
          name: 'Orquestrador',
          type: TotemType.N8N_WORKFLOW,
          iconKey: IconKey.AI_AGENT,
          checkIntervalMinutes: 5,
          enabled: true,
          config: {
            workflowId: wfTacoOrchestrator,
            tracksLlmTokens: true,
          },
        },
        {
          totemId: 'taco-finance',
          name: 'Gestor Finanças',
          type: TotemType.N8N_WORKFLOW,
          iconKey: IconKey.AI_AGENT,
          checkIntervalMinutes: 10,
          enabled: true,
          config: {
            workflowId: wfTacoFinance,
            tracksLlmTokens: true,
          },
        },
        {
          totemId: 'taco-council',
          name: 'O Conselho',
          type: TotemType.N8N_WORKFLOW,
          iconKey: IconKey.AI_AGENT,
          checkIntervalMinutes: 10,
          enabled: true,
          config: {
            workflowId: wfTacoCouncil,
            tracksLlmTokens: true,
          },
        },
        {
          totemId: 'n8n-db',
          name: '[T.A.C.O.] n8n DB',
          type: TotemType.SUPABASE_HEALTH,
          iconKey: IconKey.DATABASE,
          checkIntervalMinutes: 20,
          enabled: true,
          config: {
            supabaseUrl: supabaseN8nUrl,
            supabaseKeyEnvRef: 'SUPABASE_N8N_SERVICE_ROLE_KEY',
          },
        },
      ],
    },
    {
      slug: 'ops-backup',
      name: 'Ops & Backup',
      description: 'Rotinas de manutenção, keep-alive e backups automáticos',
      isCore: false,
      order: 3,
      totems: [
        {
          totemId: 'ops-supabase-keepalive',
          name: 'Supabase Keep-Alive',
          type: TotemType.N8N_WORKFLOW,
          iconKey: IconKey.DATABASE,
          checkIntervalMinutes: 60,
          enabled: true,
          config: {
            workflowId: wfOpsSupabaseKeepalive,
            tracksLlmTokens: false,
          },
        },
        {
          totemId: 'ops-n8n-backup',
          name: 'Backup n8n',
          type: TotemType.N8N_WORKFLOW,
          iconKey: IconKey.BACKUP,
          checkIntervalMinutes: 60,
          enabled: true,
          config: {
            workflowId: wfOpsN8nBackup,
            tracksLlmTokens: false,
          },
        },
      ],
    },
  ];
}

async function runSeed(): Promise<void> {
  const isLocal = process.argv.includes('--local');
  const uri = isLocal ? process.env.MONGO_TEST_URI : process.env.MONGO_URI;

  if (!uri) {
    throw new Error(
      isLocal
        ? 'MONGO_TEST_URI não definida no ambiente.'
        : 'MONGO_URI não definida no ambiente.',
    );
  }

  if (isLocal && !isLocalMongoUri(uri)) {
    throw new Error(
      'TRAVA DE SEGURANÇA: seed:local exige MONGO_TEST_URI apontando exclusivamente para localhost ou 127.0.0.1.',
    );
  }

  const targetLabel = isLocal ? 'MongoDB Local (Docker)' : 'MongoDB Atlas';
  console.log(`[Seed] Conectando ao ${targetLabel}...`);

  await mongoose.connect(uri);

  try {
    const AuthStateModel = mongoose.model(AuthState.name, AuthStateSchema);
    const IslandModel = mongoose.model(Island.name, IslandSchema);
    const TotemStateModel = mongoose.model(TotemState.name, TotemStateSchema);
    const TotemLogModel = mongoose.model(TotemLog.name, TotemLogSchema);

    await Promise.all([
      AuthStateModel.syncIndexes(),
      IslandModel.syncIndexes(),
      TotemStateModel.syncIndexes(),
      TotemLogModel.syncIndexes(),
    ]);

    const islands = buildSeedIslands(isLocal);
    let totalTotems = 0;

    for (const island of islands) {
      await IslandModel.updateOne(
        { slug: island.slug },
        {
          $set: {
            name: island.name,
            description: island.description,
            isCore: island.isCore,
            order: island.order,
            totems: island.totems,
          },
        },
        { upsert: true },
      );

      for (const totem of island.totems) {
        totalTotems += 1;
        await TotemStateModel.updateOne(
          { totemId: totem.totemId },
          {
            $set: {
              islandSlug: island.slug,
            },
            $setOnInsert: {
              totemId: totem.totemId,
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
          },
          { upsert: true },
        );
      }
    }

    console.log(
      `[Seed] Concluído com sucesso (${targetLabel}): ${islands.length} ilhas e ${totalTotems} totens sincronizados.`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

runSeed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[Seed] Falha ao executar seed: ${message}`);
  process.exit(1);
});
