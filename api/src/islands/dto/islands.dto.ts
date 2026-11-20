import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IconKey,
  TotemStatus,
  TotemType,
} from '../../common/types/domain.types';

export class IslandsSummaryDto {
  @ApiProperty({ example: 12 })
  totalTotems!: number;

  @ApiProperty({ example: 11 })
  healthy!: number;

  @ApiProperty({ example: 1 })
  warning!: number;

  @ApiProperty({ example: 0 })
  critical!: number;

  @ApiProperty({ example: 0 })
  unknown!: number;
}

export class HydratedTotemDto {
  @ApiProperty({ example: 'core-vm' })
  totemId!: string;

  @ApiProperty({ example: 'VM Principal' })
  name!: string;

  @ApiProperty({ enum: TotemType, example: TotemType.VM_HEARTBEAT })
  type!: TotemType;

  @ApiProperty({ enum: IconKey, example: IconKey.SERVER })
  iconKey!: IconKey;

  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ example: false })
  tracksLlmTokens!: boolean;

  @ApiProperty({ enum: TotemStatus, example: TotemStatus.HEALTHY })
  status!: TotemStatus;

  @ApiProperty({ nullable: true, type: String, example: null })
  statusReason!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    example: '2026-11-20T04:14:00.000Z',
  })
  lastCheckAt!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    example: '2026-11-18T10:00:00.000Z',
  })
  lastStatusChangeAt!: string | null;

  @ApiProperty({ nullable: true, type: Object })
  lastMetrics!: Record<string, unknown> | null;
}

export class HydratedIslandDto {
  @ApiProperty({ example: 'core' })
  slug!: string;

  @ApiProperty({ example: 'Core' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Infraestrutura principal da VM e motor n8n',
  })
  description?: string;

  @ApiProperty({ example: true })
  isCore!: boolean;

  @ApiProperty({ example: 0 })
  order!: number;

  @ApiProperty({ enum: TotemStatus, example: TotemStatus.HEALTHY })
  status!: TotemStatus;

  @ApiProperty({ type: [HydratedTotemDto] })
  totems!: HydratedTotemDto[];
}

export class IslandsResponseDto {
  @ApiProperty({ example: '2026-11-20T04:15:00.000Z' })
  generatedAt!: string;

  @ApiProperty({ type: IslandsSummaryDto })
  summary!: IslandsSummaryDto;

  @ApiProperty({ type: [HydratedIslandDto] })
  islands!: HydratedIslandDto[];
}
