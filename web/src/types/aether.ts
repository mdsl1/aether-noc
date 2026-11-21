import type { IconKey } from '../components/totems/pixelGlyphs';

export type { IconKey };

export type TotemStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export type TotemType =
  | 'vm_heartbeat'
  | 'n8n_workflow'
  | 'http_ping'
  | 'supabase_health';

export type SseConnectionState = 'connected' | 'reconnecting' | 'disconnected';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
}

export interface HydratedTotem {
  totemId: string;
  name: string;
  type: TotemType;
  iconKey: IconKey;
  enabled: boolean;
  tracksLlmTokens: boolean;
  status: TotemStatus;
  statusReason: string | null;
  lastCheckAt: string | null;
  lastStatusChangeAt: string | null;
  lastMetrics: Record<string, unknown> | null;
}

export interface HydratedIsland {
  slug: string;
  name: string;
  description?: string;
  isCore: boolean;
  order: number;
  status: TotemStatus;
  totems: HydratedTotem[];
}

export interface IslandsSummary {
  totalTotems: number;
  healthy: number;
  warning: number;
  critical: number;
  unknown: number;
}

export interface IslandsResponse {
  generatedAt: string;
  summary: IslandsSummary;
  islands: HydratedIsland[];
}

export interface TotemUpdatedSsePayload {
  islandSlug: string;
  islandStatus: TotemStatus;
  totem: {
    totemId: string;
    status: TotemStatus;
    statusReason: string | null;
    lastCheckAt: string | null;
    lastStatusChangeAt: string | null;
    lastMetrics: Record<string, unknown> | null;
  };
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface VmContainerMetric {
  name: string;
  status: string;
}

export interface VmHeartbeatMetrics {
  cpuLoad1m?: number;
  ramUsedMb?: number;
  ramTotalMb?: number;
  ramUsedPercent?: number;
  diskPercent?: number;
  containers?: VmContainerMetric[];
}

export interface HttpPingMetrics {
  statusCode?: number | null;
  latencyMs?: number;
  isReachable?: boolean;
}

export interface N8nWorkflowMetrics {
  executionId?: string;
  workflowActive?: boolean;
  executionStatus?: 'success' | 'error' | 'crashed' | 'waiting' | string;
  durationMs?: number;
  tokenUsage?: TokenUsage | null;
}

export type TotemLogMetrics = VmHeartbeatMetrics &
  HttpPingMetrics &
  N8nWorkflowMetrics;

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface TotemLogItem {
  id: string;
  status: TotemStatus;
  timestamp: string;
  summary: string | null;
  metrics: TotemLogMetrics;
}

export interface TotemLogsResponse {
  totemId: string;
  type: TotemType;
  pagination: PaginationMeta;
  tokenSummary: TokenUsage | null;
  logs: TotemLogItem[];
}

export interface ForceCheckResponse {
  totemId: string;
  islandSlug: string;
  status: TotemStatus;
  statusReason: string | null;
  lastCheckAt: string;
  lastMetrics: Record<string, unknown> | null;
}
