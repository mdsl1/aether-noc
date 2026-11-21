import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

export interface JwtPayload {
  sub: string;
  role: 'admin';
  ver?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const adminUsername =
      this.configService.getOrThrow<string>('ADMIN_USERNAME');

    if (payload.sub !== adminUsername || payload.role !== 'admin') {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }

    const currentVersion = await this.authService.getCurrentTokenVersion();
    const tokenVersion = payload.ver ?? 0;
    if (tokenVersion !== currentVersion) {
      throw new UnauthorizedException('Sessão revogada');
    }

    return {
      sub: payload.sub,
      role: payload.role,
      ver: tokenVersion,
    };
  }
}
