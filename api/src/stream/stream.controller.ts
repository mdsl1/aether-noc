import {
  Controller,
  Header,
  MessageEvent,
  Sse,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StreamService } from './stream.service';

@ApiTags('Stream')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @Sse()
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  @ApiOperation({
    summary: 'Stream Server-Sent Events (SSE) em tempo real',
    description:
      'Mantém uma conexão persistente text/event-stream emitindo eventos `totem.updated` e `ping` a cada 25 segundos.',
  })
  @ApiOkResponse({
    description:
      'Conexão SSE estabelecida com eventos `totem.updated` e `ping`.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token JWT ausente ou inválido.',
  })
  stream(): Observable<MessageEvent> {
    return this.streamService.createStream();
  }
}
