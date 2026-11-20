import 'dotenv/config';
import mongoose from 'mongoose';
import { IconKey, TotemStatus, TotemType } from '../common/types/domain.types';
import { isLocalMongoUri } from '../common/utils/mongo-uri.utils';
import { Island, IslandSchema } from './schemas/island.schema';
import { TotemState, TotemStateSchema } from './schemas/totem-state.schema';
import { TotemLog, TotemLogSchema } from './schemas/totem-log.schema';

function buildSeedIslands(): Island[] {
  const n8nBaseUrl = (
    process.env.N8N_BASE_URL ?? 'https://n8n.seudominio.com'
  ).replace(/\/+$/, '');
  const supabasePortfolioUrl = (
    process.env.SUPABASE_PORTFOLIO_URL ?? 'https://portfolio.supabase.co'
  ).replace(/\/+$/, '');
  const supabaseN8nUrl = (
    process.env.SUPABASE_N8N_URL ?? 'https://n8n.supabase.co'
  ).replace(/\/+$/, '');

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
      name: 'Portfólio',
      description: 'Aplicação web, API, contato via n8n e banco Supabase',
      isCore: false,
      order: 1,
      totems: [
        {
          totemId: 'portfolio-web',
          name: 'Portfólio Web',
          type: TotemType.HTTP_PING,
          iconKey: IconKey.GLOBE,
          checkIntervalMinutes: 20,
          enabled: true,
          config: {
            targetUrl: 'https://portfolio.exemplo.com',
            expectedStatusMin: 200,
            expectedStatusMax: 299,
            warningLatencyMs: 3000,
          },
        },
        {
          totemId: 'portfolio-api',
          name: 'Portfólio API',
          type: TotemType.HTTP_PING,
          iconKey: IconKey.API,
          checkIntervalMinutes: 15,
          enabled: true,
          config: {
            targetUrl: 'https://api.portfolio.exemplo.com/health',
            expectedStatusMin: 200,
            expectedStatusMax: 299,
            warningLatencyMs: 3000,
          },
        },
        {
          totemId: 'portfolio-n8n-contact',
          name: 'Contato (n8n)',
          type: TotemType.N8N_WORKFLOW,
          iconKey: IconKey.N8N,
          checkIntervalMinutes: 15,
          enabled: true,
          config: {
            workflowId: 'wf-portfolio-contact',
            tracksLlmTokens: false,
          },
        },
        {
          totemId: 'portfolio-db',
          name: 'Portfólio DB',
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
            workflowId: 'wf-taco-orchestrator',
            tracksLlmTokens: true,
          },
        },
        {
          totemId: 'taco-finance',
          name: 'Agente Financeiro',
          type: TotemType.N8N_WORKFLOW,
          iconKey: IconKey.AI_AGENT,
          checkIntervalMinutes: 10,
          enabled: true,
          config: {
            workflowId: 'wf-taco-finance',
            tracksLlmTokens: true,
          },
        },
        {
          totemId: 'taco-council',
          name: 'Conselho IA',
          type: TotemType.N8N_WORKFLOW,
          iconKey: IconKey.AI_AGENT,
          checkIntervalMinutes: 10,
          enabled: true,
          config: {
            workflowId: 'wf-taco-council',
            tracksLlmTokens: true,
          },
        },
        {
          totemId: 'n8n-db',
          name: 'n8n / T.A.C.O. DB',
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
            workflowId: 'wf-ops-supabase-keepalive',
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
            workflowId: 'wf-ops-n8n-backup',
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
    const IslandModel = mongoose.model(Island.name, IslandSchema);
    const TotemStateModel = mongoose.model(TotemState.name, TotemStateSchema);
    const TotemLogModel = mongoose.model(TotemLog.name, TotemLogSchema);

    await Promise.all([
      IslandModel.syncIndexes(),
      TotemStateModel.syncIndexes(),
      TotemLogModel.syncIndexes(),
    ]);

    const islands = buildSeedIslands();
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
