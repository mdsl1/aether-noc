import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  TokenUsage,
  TotemStatus,
  TotemType,
} from '../../common/types/domain.types';
import { TotemLogMetrics } from '../../database/schemas/totem-log.schema';

export class GetTotemLogsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 48 })
  totalItems!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;

  @ApiProperty({ example: true })
  hasNextPage!: boolean;
}

export class TokenSummaryDto implements TokenUsage {
  @ApiProperty({ example: 18420 })
  promptTokens!: number;

  @ApiProperty({ example: 4190 })
  completionTokens!: number;

  @ApiProperty({ example: 22610 })
  totalTokens!: number;
}

export class TotemLogItemDto {
  @ApiProperty({ example: '673d60f0a1b2c3d4e5f60001' })
  id!: string;

  @ApiProperty({ enum: TotemStatus, example: TotemStatus.HEALTHY })
  status!: TotemStatus;

  @ApiProperty({ example: '2026-11-20T04:10:12.000Z' })
  timestamp!: string;

  @ApiProperty({ nullable: true, type: String, example: null })
  summary!: string | null;

  @ApiProperty({ type: Object })
  metrics!: TotemLogMetrics;
}

export class TotemLogsResponseDto {
  @ApiProperty({ example: 'taco-orchestrator' })
  totemId!: string;

  @ApiProperty({ enum: TotemType, example: TotemType.N8N_WORKFLOW })
  type!: TotemType;

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;

  @ApiProperty({ nullable: true, type: TokenSummaryDto })
  tokenSummary!: TokenSummaryDto | null;

  @ApiProperty({ type: [TotemLogItemDto] })
  logs!: TotemLogItemDto[];
}

export class ForceCheckResponseDto {
  @ApiProperty({ example: 'portfolio-api' })
  totemId!: string;

  @ApiProperty({ example: 'portfolio' })
  islandSlug!: string;

  @ApiProperty({ enum: TotemStatus, example: TotemStatus.HEALTHY })
  status!: TotemStatus;

  @ApiProperty({ nullable: true, type: String, example: null })
  statusReason!: string | null;

  @ApiProperty({ example: '2026-11-20T04:16:05.000Z' })
  lastCheckAt!: string;

  @ApiProperty({ nullable: true, type: Object })
  lastMetrics!: Record<string, unknown> | null;
}
