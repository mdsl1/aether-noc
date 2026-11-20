import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TOTEM_UPDATED_EVENT,
  TotemStatus,
  TotemType,
  TotemUpdatedEvent,
} from '../common/types/domain.types';
import { computeIslandStatus } from '../common/utils/telemetry.utils';
import {
  Island,
  IslandDocument,
  TotemConfig,
} from '../database/schemas/island.schema';
import {
  TotemLog,
  TotemLogDocument,
} from '../database/schemas/totem-log.schema';
import {
  TotemState,
  TotemStateDocument,
} from '../database/schemas/totem-state.schema';
import { HttpPingChecker } from './checkers/http-ping.checker';
import { N8nWorkflowChecker } from './checkers/n8n-workflow.checker';
import {
  PullChecker,
  PullCheckLogEntry,
} from './checkers/pull-checker.interface';
import { SupabaseHealthChecker } from './checkers/supabase-health.checker';
import { VmHeartbeatEvaluator } from './checkers/vm-heartbeat.evaluator';
import { HeartbeatDto, HeartbeatResponseDto } from './dto/heartbeat.dto';

const HEARTBEAT_LOG_THROTTLE_MS = 10 * 60 * 1000;

export interface ForceCheckResult {
  totemId: string;
  islandSlug: string;
  status: TotemStatus;
  statusReason: string | null;
  lastCheckAt: string;
  lastMetrics: Record<string, unknown> | null;
}

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  private readonly pullCheckers: Map<TotemType, PullChecker>;

  constructor(
    @InjectModel(Island.name)
    private readonly islandModel: Model<IslandDocument>,
    @InjectModel(TotemState.name)
    private readonly totemStateModel: Model<TotemStateDocument>,
    @InjectModel(TotemLog.name)
    private readonly totemLogModel: Model<TotemLogDocument>,
    private readonly eventEmitter: EventEmitter2,
    private readonly httpPingChecker: HttpPingChecker,
    private readonly supabaseHealthChecker: SupabaseHealthChecker,
    private readonly n8nWorkflowChecker: N8nWorkflowChecker,
    private readonly vmHeartbeatEvaluator: VmHeartbeatEvaluator,
  ) {
    this.pullCheckers = new Map<TotemType, PullChecker>([
      [this.httpPingChecker.type, this.httpPingChecker],
      [this.supabaseHealthChecker.type, this.supabaseHealthChecker],
      [this.n8nWorkflowChecker.type, this.n8nWorkflowChecker],
    ]);
  }

  async runScheduledChecks(now: Date = new Date()): Promise<void> {
    const islands = await this.islandModel.find().lean().exec();
    const states = await this.totemStateModel.find().lean().exec();
    const stateMap = new Map(states.map((s) => [s.totemId, s]));

    const pullTasks: Array<Promise<void>> = [];

    for (const island of islands) {
      for (const totem of island.totems) {
        if (!totem.enabled || totem.type === TotemType.VM_HEARTBEAT) {
          continue;
        }

        const state = stateMap.get(totem.totemId);
        const lastCheckAt = state?.lastCheckAt
          ? new Date(state.lastCheckAt)
          : null;
        const intervalMs = totem.checkIntervalMinutes * 60 * 1000;
        const isDue =
          lastCheckAt === null ||
          now.getTime() - lastCheckAt.getTime() >= intervalMs;

        if (isDue) {
          pullTasks.push(
            this.executePullCheck(island, totem, now).then(() => undefined),
          );
        }
      }
    }

    if (pullTasks.length > 0) {
      const results = await Promise.allSettled(pullTasks);
      for (const result of results) {
        if (result.status === 'rejected') {
          const message =
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason);
          this.logger.error(`Erro em check agendado: ${message}`);
        }
      }
    }

    await this.checkVmDeadManSwitches(islands, now);
  }

  async forceCheck(totemId: string): Promise<ForceCheckResult> {
    const found = await this.findTotemById(totemId);
    if (!found) {
      throw new NotFoundException(`Totem '${totemId}' não encontrado`);
    }

    const { island, totem } = found;
    if (totem.type === TotemType.VM_HEARTBEAT) {
      throw new BadRequestException(
        'Totens do tipo vm_heartbeat são atualizados via push e não suportam Force Check',
      );
    }

    const updated = await this.executePullCheck(island, totem, new Date());

    return {
      totemId: totem.totemId,
      islandSlug: island.slug,
      status: updated.status,
      statusReason: updated.statusReason,
      lastCheckAt: (updated.lastCheckAt ?? new Date()).toISOString(),
      lastMetrics: updated.lastMetrics,
    };
  }

  async ingestHeartbeat(dto: HeartbeatDto): Promise<HeartbeatResponseDto> {
    const found = await this.findTotemById(dto.totemId);
    if (!found || found.totem.type !== TotemType.VM_HEARTBEAT) {
      throw new NotFoundException(
        `Totem '${dto.totemId}' não cadastrado ou não é do tipo vm_heartbeat`,
      );
    }

    const { island, totem } = found;
    const serverNow = new Date();
    const state = await this.getOrCreateState(island.slug, totem.totemId);

    const evaluation = this.vmHeartbeatEvaluator.evaluate(totem, dto.metrics);
    const previousStatus = state.status;
    const statusChanged = evaluation.status !== previousStatus;

    state.previousStatus = previousStatus;
    state.status = evaluation.status;
    state.statusReason = evaluation.statusReason;
    state.consecutiveFailures = 0;
    state.lastCheckAt = serverNow;
    if (statusChanged) {
      state.lastStatusChangeAt = serverNow;
    }
    state.lastMetrics = evaluation.metrics as unknown as Record<
      string,
      unknown
    >;
    await state.save();

    const shouldPersistLog = await this.shouldPersistHeartbeatLog(
      totem.totemId,
      statusChanged,
      evaluation.status,
      serverNow,
    );

    if (shouldPersistLog) {
      await this.totemLogModel.create({
        totemId: totem.totemId,
        type: TotemType.VM_HEARTBEAT,
        status: evaluation.status,
        timestamp: serverNow,
        summary: evaluation.statusReason,
        metrics: evaluation.metrics,
      });
    }

    await this.emitTotemUpdated(island, totem, state, previousStatus);

    return {
      received: true,
      totemId: totem.totemId,
      evaluatedStatus: evaluation.status,
      serverTimestamp: serverNow.toISOString(),
    };
  }

  async checkVmDeadManSwitches(
    preloadedIslands?: Island[],
    now: Date = new Date(),
  ): Promise<void> {
    const islands =
      preloadedIslands ?? (await this.islandModel.find().lean().exec());

    for (const island of islands) {
      for (const totem of island.totems) {
        if (!totem.enabled || totem.type !== TotemType.VM_HEARTBEAT) {
          continue;
        }

        const state = await this.totemStateModel
          .findOne({ totemId: totem.totemId })
          .exec();

        if (!state || state.status === TotemStatus.CRITICAL) {
          continue;
        }

        const timeoutCheck = this.vmHeartbeatEvaluator.isHeartbeatTimedOut(
          totem,
          state.lastCheckAt,
          now,
        );

        if (!timeoutCheck.timedOut) {
          continue;
        }

        const previousStatus = state.status;
        state.previousStatus = previousStatus;
        state.status = TotemStatus.CRITICAL;
        state.statusReason = timeoutCheck.reason;
        state.lastStatusChangeAt = now;
        await state.save();

        await this.totemLogModel.create({
          totemId: totem.totemId,
          type: TotemType.VM_HEARTBEAT,
          status: TotemStatus.CRITICAL,
          timestamp: now,
          summary: timeoutCheck.reason,
          metrics: {},
        });

        await this.emitTotemUpdated(island, totem, state, previousStatus);
      }
    }
  }

  private async executePullCheck(
    island: Island,
    totem: TotemConfig,
    now: Date,
  ): Promise<TotemStateDocument> {
    const checker = this.pullCheckers.get(totem.type);
    if (!checker) {
      throw new BadRequestException(
        `Checker não encontrado para o tipo '${totem.type}'`,
      );
    }

    const state = await this.getOrCreateState(island.slug, totem.totemId);
    const result = await checker.check(totem, state);

    const previousStatus = state.status;
    const statusChanged = result.status !== previousStatus;

    state.previousStatus = previousStatus;
    state.status = result.status;
    state.statusReason = result.statusReason;
    state.consecutiveFailures = result.consecutiveFailures;
    state.lastCheckAt = now;
    if (statusChanged) {
      state.lastStatusChangeAt = now;
    }
    if (result.lastProcessedExecutionId !== undefined) {
      state.lastProcessedExecutionId = result.lastProcessedExecutionId;
    }
    state.lastMetrics = result.lastMetrics;
    await state.save();

    await this.persistPullLogs(totem, result.logsToInsert);
    await this.emitTotemUpdated(island, totem, state, previousStatus);

    return state;
  }

  private async persistPullLogs(
    totem: TotemConfig,
    entries: PullCheckLogEntry[],
  ): Promise<void> {
    for (const entry of entries) {
      try {
        await this.totemLogModel.create({
          totemId: totem.totemId,
          type: totem.type,
          status: entry.status,
          timestamp: entry.timestamp,
          summary: entry.summary,
          metrics: entry.metrics,
        });
      } catch (error: unknown) {
        // Ignora erro E11000 (índice único parcial de deduplicação de executionId do n8n)
        const mongoCode =
          typeof error === 'object' && error !== null && 'code' in error
            ? (error as { code?: number }).code
            : undefined;
        if (mongoCode === 11000) {
          this.logger.debug(
            `Execução duplicada ignorada para totem '${totem.totemId}'`,
          );
          continue;
        }
        throw error;
      }
    }
  }

  private async shouldPersistHeartbeatLog(
    totemId: string,
    statusChanged: boolean,
    status: TotemStatus,
    now: Date,
  ): Promise<boolean> {
    if (
      statusChanged ||
      status === TotemStatus.WARNING ||
      status === TotemStatus.CRITICAL
    ) {
      return true;
    }

    const latestLog = await this.totemLogModel
      .findOne({ totemId })
      .sort({ timestamp: -1 })
      .select({ timestamp: 1 })
      .lean()
      .exec();

    if (!latestLog) {
      return true;
    }

    return (
      now.getTime() - new Date(latestLog.timestamp).getTime() >=
      HEARTBEAT_LOG_THROTTLE_MS
    );
  }

  private async getOrCreateState(
    islandSlug: string,
    totemId: string,
  ): Promise<TotemStateDocument> {
    const existing = await this.totemStateModel.findOne({ totemId }).exec();
    if (existing) {
      return existing;
    }

    return this.totemStateModel.create({
      totemId,
      islandSlug,
      status: TotemStatus.UNKNOWN,
      previousStatus: TotemStatus.UNKNOWN,
      statusReason: null,
      consecutiveFailures: 0,
      lastCheckAt: null,
      lastStatusChangeAt: null,
      lastAlertSentAt: null,
      alertActive: false,
      lastMetrics: null,
    });
  }

  private async findTotemById(
    totemId: string,
  ): Promise<{ island: Island; totem: TotemConfig } | null> {
    const island = await this.islandModel
      .findOne({ 'totems.totemId': totemId })
      .lean()
      .exec();

    if (!island) {
      return null;
    }

    const totem = island.totems.find((t) => t.totemId === totemId);
    if (!totem) {
      return null;
    }

    return { island, totem };
  }

  private async emitTotemUpdated(
    island: Island,
    totem: TotemConfig,
    state: TotemState,
    previousStatus: TotemStatus,
  ): Promise<void> {
    const islandStates = await this.totemStateModel
      .find({ islandSlug: island.slug })
      .select({ totemId: 1, status: 1 })
      .lean()
      .exec();

    const stateStatusById = new Map(
      islandStates.map((s) => [s.totemId, s.status]),
    );
    const activeStatuses = island.totems
      .filter((t) => t.enabled)
      .map((t) => stateStatusById.get(t.totemId) ?? TotemStatus.UNKNOWN);

    const islandStatus = computeIslandStatus(activeStatuses);

    const payload: TotemUpdatedEvent = {
      islandSlug: island.slug,
      islandName: island.name,
      islandStatus,
      previousStatus,
      totem: {
        totemId: totem.totemId,
        name: totem.name,
        status: state.status,
        statusReason: state.statusReason,
        lastCheckAt: state.lastCheckAt ? state.lastCheckAt.toISOString() : null,
        lastStatusChangeAt: state.lastStatusChangeAt
          ? state.lastStatusChangeAt.toISOString()
          : null,
        lastMetrics: state.lastMetrics,
      },
    };

    this.eventEmitter.emit(TOTEM_UPDATED_EVENT, payload);
  }
}
