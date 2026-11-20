import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { TotemStatus } from '../../common/types/domain.types';

export class ContainerMetricDto {
  @ApiProperty({ example: 'n8n' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'running' })
  @IsString()
  @IsNotEmpty()
  status!: string;
}

export class VmMetricsDto {
  @ApiProperty({ example: 0.42 })
  @IsNumber()
  @Min(0)
  cpuLoad1m!: number;

  @ApiProperty({ example: 1450 })
  @IsNumber()
  @Min(0)
  ramUsedMb!: number;

  @ApiProperty({ example: 4096 })
  @IsNumber()
  @Min(1)
  ramTotalMb!: number;

  @ApiProperty({ example: 48 })
  @IsNumber()
  @Min(0)
  @Max(100)
  diskPercent!: number;

  @ApiProperty({ type: [ContainerMetricDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContainerMetricDto)
  containers!: ContainerMetricDto[];
}

export class HeartbeatDto {
  @ApiProperty({ example: 'core-vm' })
  @IsString()
  @IsNotEmpty()
  totemId!: string;

  @ApiProperty({ example: '2026-11-20T04:15:00Z' })
  @IsISO8601()
  timestamp!: string;

  @ApiProperty({ type: VmMetricsDto })
  @ValidateNested()
  @Type(() => VmMetricsDto)
  metrics!: VmMetricsDto;
}

export class HeartbeatResponseDto {
  @ApiProperty({ example: true })
  received!: boolean;

  @ApiProperty({ example: 'core-vm' })
  totemId!: string;

  @ApiProperty({ enum: TotemStatus, example: TotemStatus.HEALTHY })
  evaluatedStatus!: TotemStatus;

  @ApiProperty({ example: '2026-11-20T04:15:01.120Z' })
  serverTimestamp!: string;
}
