import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  XOctagon,
  type LucideIcon,
} from 'lucide-react';
import type {
  HttpPingMetrics,
  HydratedTotem,
  N8nWorkflowMetrics,
  TokenUsage,
  TotemStatus,
  TotemType,
  VmContainerMetric,
  VmHeartbeatMetrics,
} from '../types/aether';

export interface StatusPresentation {
  label: string;
  Icon: LucideIcon;
  badgeClass: string;
  textClass: string;
  dotClass: string;
}

export const STATUS_PRESENTATION: Record<TotemStatus, StatusPresentation> = {
  healthy: {
    label: 'Saudável',
    Icon: CheckCircle2,
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
    textClass: 'text-emerald-400',
    dotClass: 'bg-emerald-400',
  },
  warning: {
    label: 'Instável',
    Icon: AlertTriangle,
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    textClass: 'text-amber-400',
    dotClass: 'bg-amber-400',
  },
  critical: {
    label: 'Crítico',
    Icon: XOctagon,
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/45',
    textClass: 'text-red-400',
    dotClass: 'bg-red-500',
  },
  unknown: {
    label: 'Desconhecido',
    Icon: HelpCircle,
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/35',
    textClass: 'text-slate-400',
    dotClass: 'bg-slate-400',
  },
};

export const TOTEM_TYPE_LABEL: Record<TotemType, string> = {
  vm_heartbeat: 'VM Heartbeat',
  n8n_workflow: 'Workflow n8n',
  http_ping: 'HTTP Ping',
  supabase_health: 'Supabase Health',
};

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && !Number.isNaN(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function parseVmMetrics(
  raw: Record<string, unknown> | null | undefined,
): VmHeartbeatMetrics {
  if (!raw) {
    return {};
  }

  const rawContainers = Array.isArray(raw.containers) ? raw.containers : [];
  const containers: VmContainerMetric[] = [];
  for (const item of rawContainers) {
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      const name = asString(record.name);
      const status = asString(record.status);
      if (name && status) {
        containers.push({ name, status });
      }
    }
  }

  const ramUsedMb = asNumber(raw.ramUsedMb);
  const ramTotalMb = asNumber(raw.ramTotalMb);
  const explicitRamPercent = asNumber(raw.ramUsedPercent);
  const ramUsedPercent =
    explicitRamPercent ??
    (ramUsedMb !== undefined && ramTotalMb !== undefined && ramTotalMb > 0
      ? Number(((ramUsedMb / ramTotalMb) * 100).toFixed(1))
      : undefined);

  return {
    cpuLoad1m: asNumber(raw.cpuLoad1m),
    ramUsedMb,
    ramTotalMb,
    ramUsedPercent,
    diskPercent: asNumber(raw.diskPercent),
    containers,
  };
}

export function parseHttpMetrics(
  raw: Record<string, unknown> | null | undefined,
): HttpPingMetrics {
  if (!raw) {
    return {};
  }
  const statusCode =
    raw.statusCode === null ? null : asNumber(raw.statusCode);
  return {
    statusCode,
    latencyMs: asNumber(raw.latencyMs),
    isReachable: asBoolean(raw.isReachable),
  };
}

export function parseTokenUsage(raw: unknown): TokenUsage | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const promptTokens = asNumber(record.promptTokens);
  const completionTokens = asNumber(record.completionTokens);
  const totalTokens = asNumber(record.totalTokens);
  if (
    promptTokens === undefined ||
    completionTokens === undefined ||
    totalTokens === undefined
  ) {
    return null;
  }
  return { promptTokens, completionTokens, totalTokens };
}

export function parseN8nMetrics(
  raw: Record<string, unknown> | null | undefined,
): N8nWorkflowMetrics {
  if (!raw) {
    return {};
  }
  return {
    executionId: asString(raw.executionId),
    workflowActive: asBoolean(raw.workflowActive),
    executionStatus: asString(raw.executionStatus),
    durationMs: asNumber(raw.durationMs),
    tokenUsage: parseTokenUsage(raw.tokenUsage),
  };
}

export function getHttpStatusText(statusCode: number | null | undefined): string {
  if (typeof statusCode !== 'number') {
    return 'Sem resposta';
  }
  if (statusCode >= 200 && statusCode < 300) {
    return `${statusCode} OK`;
  }
  return `HTTP ${statusCode}`;
}

export function getExecutionStatusLabel(
  status: string | undefined,
): string {
  switch (status) {
    case 'success':
      return 'Sucesso';
    case 'error':
      return 'Erro';
    case 'crashed':
      return 'Falha crítica';
    case 'waiting':
      return 'Aguardando';
    default:
      return 'Sem execuções';
  }
}

/**
 * Monta um resumo conciso de 1 linha para o Hover Tooltip do totem.
 */
export function getTotemQuickSummary(totem: HydratedTotem): string {
  if (totem.type === 'vm_heartbeat') {
    const metrics = parseVmMetrics(totem.lastMetrics);
    const parts: string[] = [];
    if (metrics.ramUsedPercent !== undefined) {
      parts.push(`RAM ${Math.round(metrics.ramUsedPercent)}%`);
    }
    if (metrics.diskPercent !== undefined) {
      parts.push(`Disco ${Math.round(metrics.diskPercent)}%`);
    }
    if (parts.length > 0) {
      return parts.join(' • ');
    }
    return totem.statusReason ?? 'Aguardando heartbeat';
  }

  if (totem.type === 'http_ping' || totem.type === 'supabase_health') {
    const metrics = parseHttpMetrics(totem.lastMetrics);
    if (metrics.statusCode !== undefined && metrics.statusCode !== null) {
      const codeLabel = getHttpStatusText(metrics.statusCode);
      if (metrics.latencyMs !== undefined) {
        return `${codeLabel} • ${Math.round(metrics.latencyMs)}ms`;
      }
      return codeLabel;
    }
    if (metrics.isReachable === false) {
      return totem.statusReason ?? 'Serviço inacessível';
    }
    return totem.statusReason ?? 'Aguardando 1ª verificação';
  }

  // n8n_workflow
  const metrics = parseN8nMetrics(totem.lastMetrics);
  if (metrics.workflowActive === false) {
    return 'Workflow desativado no n8n';
  }
  if (metrics.executionStatus) {
    return `Última exec: ${getExecutionStatusLabel(metrics.executionStatus)}`;
  }
  return totem.statusReason ?? 'Aguardando execução';
}
