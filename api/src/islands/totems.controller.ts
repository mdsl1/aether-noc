import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TelemetryService } from '../telemetry/telemetry.service';
import {
  ForceCheckResponseDto,
  GetTotemLogsQueryDto,
  TotemLogsResponseDto,
} from './dto/totem-logs.dto';
import { IslandsService } from './islands.service';

@ApiTags('Totems')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('totems')
export class TotemsController {
  constructor(
    private readonly islandsService: IslandsService,
    private readonly telemetryService: TelemetryService,
  ) {}

  @Get(':totemId/logs')
  @ApiOperation({
    summary:
      'Retorna o histórico paginado de verificações/execuções do totem e resumo de tokens LLM',
  })
  @ApiParam({ name: 'totemId', example: 'taco-orchestrator' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Histórico retornado com sucesso',
    type: TotemLogsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT ausente ou inválido',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'totemId não encontrado',
  })
  getTotemLogs(
    @Param('totemId') totemId: string,
    @Query() query: GetTotemLogsQueryDto,
  ): Promise<TotemLogsResponseDto> {
    return this.islandsService.getTotemLogs(totemId, query);
  }

  @Post(':totemId/check')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Dispara verificação manual sob demanda (Force Check) para totens do tipo Pull',
  })
  @ApiParam({ name: 'totemId', example: 'portfolio-api' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verificação executada com sucesso',
    type: ForceCheckResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Totens do tipo vm_heartbeat não suportam Force Check',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT ausente ou inválido',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'totemId não encontrado',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Limite de Force Checks excedido (10 req/min)',
  })
  forceCheck(
    @Param('totemId') totemId: string,
  ): Promise<ForceCheckResponseDto> {
    return this.telemetryService.forceCheck(totemId);
  }
}
