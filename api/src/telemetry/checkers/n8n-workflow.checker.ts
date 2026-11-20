import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  TokenUsage,
  TotemStatus,
  TotemType,
} from '../../common/types/domain.types';
import { truncateSummary } from '../../common/utils/telemetry.utils';
import { TotemConfig } from '../../database/schemas/island.schema';
import { TotemState } from '../../database/schemas/totem-state.schema';
import { extractTokenUsageFromRunData } from '../utils/n8n-token-parser';
import {
  PullChecker,
  PullCheckerResult,
  PullCheckLogEntry,
} from './pull-checker.interface';

const N8N_TIMEOUT_MS = 8000;

interface N8nWorkflowResponse {
  id?: string | number;
  active?: boolean;
}

interface N8nExecutionItem {
  id: string | number;
  status?: string;
  finished?: boolean;
  startedAt?: string;
  stoppedAt?: string;
  data?: {
    resultData?: {
      runData?: unknown;
      error?: {
        message?: string;
      };
    };
  };
}

interface N8nExecutionsResponse {
  data?: N8nExecutionItem[];
}

type NormalizedExecutionStatus = 'success' | 'error' | 'crashed' | 'waiting';

interface ParsedExecution {
  executionId: string;
  executionStatus: NormalizedExecutionStatus;
  durationMs?: number;
  tokenUsage: TokenUsage | null;
  errorMessage: string | null;
  timestamp: Date;
}

@Injectable()
export class N8nWorkflowChecker implements PullChecker {
  readonly type = TotemType.N8N_WORKFLOW;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async check(
    totem: TotemConfig,
    state: TotemState,
  ): Promise<PullCheckerResult> {
    const workflowId = totem.config?.workflowId;
    const baseUrl = this.configService
      .getOrThrow<string>('N8N_BASE_URL')
      .replace(/\/+$/, '');
    const apiKey = this.configService.getOrThrow<string>('N8N_API_KEY');

    if (!workflowId) {
      return this.handleApiFailure(
        state,
        'workflowId não configurado para o totem',
      );
    }

    const headers = { 'X-N8N-API-KEY': apiKey };

    try {
      const [workflowRes, executionsRes] = await Promise.all([
        firstValueFrom(
          this.httpService.get<N8nWorkflowResponse>(
            `${baseUrl}/api/v1/workflows/${encodeURIComponent(workflowId)}`,
            {
              headers,
              timeout: N8N_TIMEOUT_MS,
            },
          ),
        ),
        firstValueFrom(
          this.httpService.get<N8nExecutionsResponse | N8nExecutionItem[]>(
            `${baseUrl}/api/v1/executions`,
            {
              headers,
              timeout: N8N_TIMEOUT_MS,
              params: {
                workflowId,
                limit: 10,
                includeData: true,
              },
            },
          ),
        ),
      ]);

      const workflowActive = Boolean(workflowRes.data?.active);
      const rawExecutions = Array.isArray(executionsRes.data)
        ? executionsRes.data
        : (executionsRes.data?.data ?? []);

      const parsedExecutions = rawExecutions
        .filter((exec) => exec && exec.id !== undefined && exec.id !== null)
        .map((exec) => this.parseExecution(exec));

      const latestExecution = parsedExecutions[0] ?? null;

      // Filtra apenas execuções ainda não processadas (deduplicação)
      const newExecutions: ParsedExecution[] = [];
      for (const exec of parsedExecutions) {
        if (
          state.lastProcessedExecutionId &&
          exec.executionId === state.lastProcessedExecutionId
        ) {
          break;
        }
        newExecutions.push(exec);
      }

      const logsToInsert: PullCheckLogEntry[] = newExecutions.map((exec) => {
        const execTotemStatus = this.mapExecutionToTotemStatus(
          exec.executionStatus,
          workflowActive,
        );
        const summary =
          exec.executionStatus === 'error' || exec.executionStatus === 'crashed'
            ? truncateSummary(
                exec.errorMessage
                  ? `Falha na execução #${exec.executionId}: ${exec.errorMessage}`
                  : `Falha na execução #${exec.executionId}`,
              )
            : null;

        return {
          status: execTotemStatus,
          timestamp: exec.timestamp,
          summary,
          metrics: {
            executionId: exec.executionId,
            workflowActive,
            executionStatus: exec.executionStatus,
            ...(exec.durationMs !== undefined
              ? { durationMs: exec.durationMs }
              : {}),
            tokenUsage: exec.tokenUsage,
          },
        };
      });

      const { status, statusReason } = this.evaluateWorkflowState(
        workflowActive,
        latestExecution,
        state,
      );

      const lastMetrics: Record<string, unknown> = latestExecution
        ? {
            executionId: latestExecution.executionId,
            workflowActive,
            executionStatus: latestExecution.executionStatus,
            ...(latestExecution.durationMs !== undefined
              ? { durationMs: latestExecution.durationMs }
              : {}),
            tokenUsage: latestExecution.tokenUsage,
          }
        : { workflowActive };

      return {
        status,
        statusReason,
        consecutiveFailures: 0,
        lastMetrics,
        lastProcessedExecutionId:
          latestExecution?.executionId ?? state.lastProcessedExecutionId,
        logsToInsert,
      };
    } catch (error: unknown) {
      const detail =
        error instanceof Error ? error.message : 'Timeout ou erro na API n8n';
      return this.handleApiFailure(state, detail);
    }
  }

  private handleApiFailure(
    state: TotemState,
    detail: string,
  ): PullCheckerResult {
    const consecutiveFailures = state.consecutiveFailures + 1;
    const now = new Date();

    if (consecutiveFailures === 1) {
      const reason = truncateSummary(
        `Falha temporária na API do n8n (${detail}) — 1/2`,
      );
      return {
        status: TotemStatus.WARNING,
        statusReason: reason,
        consecutiveFailures,
        lastMetrics: state.lastMetrics,
        lastProcessedExecutionId: state.lastProcessedExecutionId,
        logsToInsert: [
          {
            status: TotemStatus.WARNING,
            timestamp: now,
            summary: reason,
            metrics: {},
          },
        ],
      };
    }

    const reason = 'API do n8n inacessível';
    return {
      status: TotemStatus.CRITICAL,
      statusReason: reason,
      consecutiveFailures,
      lastMetrics: state.lastMetrics,
      lastProcessedExecutionId: state.lastProcessedExecutionId,
      logsToInsert: [
        {
          status: TotemStatus.CRITICAL,
          timestamp: now,
          summary: truncateSummary(`${reason} (${detail})`),
          metrics: {},
        },
      ],
    };
  }

  private parseExecution(exec: N8nExecutionItem): ParsedExecution {
    const executionId = String(exec.id);
    const executionStatus = this.normalizeExecutionStatus(
      exec.status,
      exec.finished,
    );

    let durationMs: number | undefined;
    if (exec.startedAt && exec.stoppedAt) {
      const diff =
        new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime();
      if (Number.isFinite(diff) && diff >= 0) {
        durationMs = Math.round(diff);
      }
    }

    const timestampSource = exec.stoppedAt ?? exec.startedAt;
    const parsedDate = timestampSource ? new Date(timestampSource) : new Date();
    const timestamp = Number.isNaN(parsedDate.getTime())
      ? new Date()
      : parsedDate;

    const tokenUsage = extractTokenUsageFromRunData(
      exec.data?.resultData?.runData,
    );
    const errorMessage =
      typeof exec.data?.resultData?.error?.message === 'string'
        ? exec.data.resultData.error.message
        : null;

    return {
      executionId,
      executionStatus,
      durationMs,
      tokenUsage,
      errorMessage,
      timestamp,
    };
  }

  private normalizeExecutionStatus(
    status?: string,
    finished?: boolean,
  ): NormalizedExecutionStatus {
    if (
      status === 'success' ||
      status === 'error' ||
      status === 'crashed' ||
      status === 'waiting'
    ) {
      return status;
    }
    if (finished === true) {
      return 'success';
    }
    return 'waiting';
  }

  private mapExecutionToTotemStatus(
    executionStatus: NormalizedExecutionStatus,
    workflowActive: boolean,
  ): TotemStatus {
    if (executionStatus === 'error' || executionStatus === 'crashed') {
      return TotemStatus.CRITICAL;
    }
    if (!workflowActive) {
      return TotemStatus.WARNING;
    }
    return TotemStatus.HEALTHY;
  }

  private evaluateWorkflowState(
    workflowActive: boolean,
    latestExecution: ParsedExecution | null,
    state: TotemState,
  ): { status: TotemStatus; statusReason: string | null } {
    if (
      latestExecution &&
      (latestExecution.executionStatus === 'error' ||
        latestExecution.executionStatus === 'crashed')
    ) {
      const reason = truncateSummary(
        latestExecution.errorMessage
          ? `Falha na execução #${latestExecution.executionId}: ${latestExecution.errorMessage}`
          : `Falha na execução #${latestExecution.executionId}`,
      );
      return { status: TotemStatus.CRITICAL, statusReason: reason };
    }

    if (!workflowActive) {
      return {
        status: TotemStatus.WARNING,
        statusReason: 'Workflow desativado no n8n',
      };
    }

    if (latestExecution && latestExecution.executionStatus === 'success') {
      return { status: TotemStatus.HEALTHY, statusReason: null };
    }

    // Workflow ativo sem execução recente (ou em andamento): mantém status atual ou healthy se unknown
    if (state.status === TotemStatus.UNKNOWN) {
      return { status: TotemStatus.HEALTHY, statusReason: null };
    }

    return {
      status: state.status,
      statusReason:
        state.status === TotemStatus.HEALTHY ? null : state.statusReason,
    };
  }
}
