import { TotemStatus, TotemType } from '../../common/types/domain.types';
import { TotemConfig } from '../../database/schemas/island.schema';
import { TotemLogMetrics } from '../../database/schemas/totem-log.schema';
import { TotemState } from '../../database/schemas/totem-state.schema';

export interface PullCheckLogEntry {
  status: TotemStatus;
  timestamp: Date;
  summary: string | null;
  metrics: TotemLogMetrics;
}

export interface PullCheckerResult {
  status: TotemStatus;
  statusReason: string | null;
  consecutiveFailures: number;
  lastMetrics: Record<string, unknown> | null;
  lastProcessedExecutionId?: string;
  logsToInsert: PullCheckLogEntry[];
}

export interface PullChecker {
  readonly type: TotemType;
  check(totem: TotemConfig, state: TotemState): Promise<PullCheckerResult>;
}
