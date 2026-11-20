import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Connection, ConnectionStates } from 'mongoose';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  @ApiOperation({
    summary: 'Healthcheck público da API e conectividade com o MongoDB',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API operacional e MongoDB conectado',
    schema: {
      example: {
        status: 'ok',
        database: 'connected',
        uptime: 86400,
        timestamp: '2026-11-20T04:15:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'MongoDB desconectado',
    schema: {
      example: {
        status: 'error',
        database: 'disconnected',
        uptime: 86400,
        timestamp: '2026-11-20T04:15:00.000Z',
      },
    },
  })
  check(@Res() res: Response): void {
    const isConnected =
      this.connection.readyState === ConnectionStates.connected;
    const payload = {
      status: isConnected ? 'ok' : 'error',
      database: isConnected ? 'connected' : 'disconnected',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };

    res
      .status(isConnected ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json(payload);
  }
}
