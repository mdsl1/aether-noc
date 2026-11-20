import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const rawHeader = request.headers['x-api-key'];
    const providedKey = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!providedKey || typeof providedKey !== 'string') {
      throw new UnauthorizedException('API Key ausente ou inválida');
    }

    const expectedKey = this.configService.getOrThrow<string>('INGEST_API_KEY');
    const providedBuffer = Buffer.from(providedKey, 'utf8');
    const expectedBuffer = Buffer.from(expectedKey, 'utf8');

    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('API Key ausente ou inválida');
    }

    return true;
  }
}
