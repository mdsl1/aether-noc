import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { HeartbeatDto, HeartbeatResponseDto } from './dto/heartbeat.dto';
import { TelemetryService } from './telemetry.service';

@ApiTags('Telemetry')
@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post('heartbeat')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiSecurity('x-api-key')
  @ApiOperation({
    summary:
      'Recebe telemetria (push) de CPU, RAM, Disco e containers Docker da VM Ubuntu',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Heartbeat recebido e avaliado com sucesso',
    type: HeartbeatResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Payload malformado ou campo extra não permitido',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Header x-api-key ausente ou inválido',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'totemId não cadastrado ou não é do tipo vm_heartbeat',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Limite de requisições excedido (10 req/min)',
  })
  ingestHeartbeat(@Body() dto: HeartbeatDto): Promise<HeartbeatResponseDto> {
    return this.telemetryService.ingestHeartbeat(dto);
  }
}
