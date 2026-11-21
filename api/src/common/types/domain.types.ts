export enum TotemStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown',
}

export enum TotemType {
  VM_HEARTBEAT = 'vm_heartbeat',
  HTTP_PING = 'http_ping',
  N8N_WORKFLOW = 'n8n_workflow',
  SUPABASE_HEALTH = 'supabase_health',
}

export enum IconKey {
  SERVER = 'server',
  N8N = 'n8n',
  GLOBE = 'globe',
  API = 'api',
  DATABASE = 'database',
  AI_AGENT = 'ai_agent',
  BACKUP = 'backup',
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export const TOTEM_UPDATED_EVENT = 'totem.updated';
export const AUTH_LOGOUT_EVENT = 'auth.logout';

export interface TotemUpdatedEvent {
  islandSlug: string;
  islandName: string;
  islandStatus: TotemStatus;
  previousStatus: TotemStatus;
  totem: {
    totemId: string;
    name: string;
    status: TotemStatus;
    statusReason: string | null;
    lastCheckAt: string | null;
    lastStatusChangeAt: string | null;
    lastMetrics: Record<string, unknown> | null;
  };
}
