import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TotemStatus } from '../common/types/domain.types';
import { computeIslandStatus } from '../common/utils/telemetry.utils';
import { Island, IslandDocument } from '../database/schemas/island.schema';
import {
  TotemLog,
  TotemLogDocument,
} from '../database/schemas/totem-log.schema';
import {
  TotemState,
  TotemStateDocument,
} from '../database/schemas/totem-state.schema';
import {
  HydratedIslandDto,
  HydratedTotemDto,
  IslandsResponseDto,
  IslandsSummaryDto,
} from './dto/islands.dto';
import {
  GetTotemLogsQueryDto,
  TokenSummaryDto,
  TotemLogsResponseDto,
} from './dto/totem-logs.dto';

interface TokenAggregationRow {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

@Injectable()
export class IslandsService {
  constructor(
    @InjectModel(Island.name)
    private readonly islandModel: Model<IslandDocument>,
    @InjectModel(TotemState.name)
    private readonly totemStateModel: Model<TotemStateDocument>,
    @InjectModel(TotemLog.name)
    private readonly totemLogModel: Model<TotemLogDocument>,
  ) {}

  async getIslands(): Promise<IslandsResponseDto> {
    const [islands, states] = await Promise.all([
      this.islandModel.find().sort({ order: 1 }).lean().exec(),
      this.totemStateModel.find().lean().exec(),
    ]);

    const stateByTotemId = new Map(states.map((s) => [s.totemId, s]));

    const summary: IslandsSummaryDto = {
      totalTotems: 0,
      healthy: 0,
      warning: 0,
      critical: 0,
      unknown: 0,
    };

    const hydratedIslands: HydratedIslandDto[] = islands.map((island) => {
      const activeStatuses: TotemStatus[] = [];

      const totems: HydratedTotemDto[] = island.totems.map((totem) => {
        const state = stateByTotemId.get(totem.totemId);
        const status = state?.status ?? TotemStatus.UNKNOWN;

        summary.totalTotems += 1;
        summary[status] += 1;

        if (totem.enabled) {
          activeStatuses.push(status);
        }

        // Regra RNF-13: nunca expor `config` interno (chaves/env refs)
        return {
          totemId: totem.totemId,
          name: totem.name,
          type: totem.type,
          iconKey: totem.iconKey,
          enabled: totem.enabled,
          tracksLlmTokens: Boolean(totem.config?.tracksLlmTokens),
          status,
          statusReason: state?.statusReason ?? null,
          lastCheckAt: state?.lastCheckAt
            ? new Date(state.lastCheckAt).toISOString()
            : null,
          lastStatusChangeAt: state?.lastStatusChangeAt
            ? new Date(state.lastStatusChangeAt).toISOString()
            : null,
          lastMetrics: state?.lastMetrics ?? null,
        };
      });

      return {
        slug: island.slug,
        name: island.name,
        description: island.description,
        isCore: island.isCore,
        order: island.order,
        status: computeIslandStatus(activeStatuses),
        totems,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      summary,
      islands: hydratedIslands,
    };
  }

  async getTotemLogs(
    totemId: string,
    query: GetTotemLogsQueryDto,
  ): Promise<TotemLogsResponseDto> {
    const island = await this.islandModel
      .findOne({ 'totems.totemId': totemId })
      .lean()
      .exec();

    const totem = island?.totems.find((t) => t.totemId === totemId);
    if (!totem) {
      throw new NotFoundException(`Totem '${totemId}' não encontrado`);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [logs, totalItems, tokenSummary] = await Promise.all([
      this.totemLogModel
        .find({ totemId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.totemLogModel.countDocuments({ totemId }).exec(),
      totem.config?.tracksLlmTokens
        ? this.computeTokenSummary(totemId)
        : Promise.resolve(null),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    return {
      totemId: totem.totemId,
      type: totem.type,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
      },
      tokenSummary,
      logs: logs.map((log) => ({
        id: String(log._id),
        status: log.status,
        timestamp: new Date(log.timestamp).toISOString(),
        summary: log.summary ?? null,
        metrics: log.metrics,
      })),
    };
  }

  private async computeTokenSummary(totemId: string): Promise<TokenSummaryDto> {
    const rows = await this.totemLogModel
      .aggregate<TokenAggregationRow>([
        {
          $match: {
            totemId,
            'metrics.tokenUsage': { $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            promptTokens: { $sum: '$metrics.tokenUsage.promptTokens' },
            completionTokens: { $sum: '$metrics.tokenUsage.completionTokens' },
            totalTokens: { $sum: '$metrics.tokenUsage.totalTokens' },
          },
        },
      ])
      .exec();

    const aggregated = rows[0];
    return {
      promptTokens: aggregated?.promptTokens ?? 0,
      completionTokens: aggregated?.completionTokens ?? 0,
      totalTokens: aggregated?.totalTokens ?? 0,
    };
  }
}
