import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { AUTH_LOGOUT_EVENT } from '../common/types/domain.types';
import {
  ADMIN_AUTH_STATE_KEY,
  AuthState,
  AuthStateDocument,
} from '../database/schemas/auth-state.schema';
import { LoginDto, LoginResponseDto, LogoutResponseDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(AuthState.name)
    private readonly authStateModel: Model<AuthStateDocument>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getCurrentTokenVersion(): Promise<number> {
    const state = await this.authStateModel
      .findOne({ key: ADMIN_AUTH_STATE_KEY })
      .select({ tokenVersion: 1 })
      .lean()
      .exec();

    return state?.tokenVersion ?? 0;
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const adminUsername =
      this.configService.getOrThrow<string>('ADMIN_USERNAME');
    const adminPasswordHash = this.configService.getOrThrow<string>(
      'ADMIN_PASSWORD_HASH',
    );

    const isUsernameValid = dto.username === adminUsername;
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      adminPasswordHash,
    );

    if (!isUsernameValid || !isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const tokenVersion = await this.getCurrentTokenVersion();
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '7d');
    const payload: JwtPayload = {
      sub: adminUsername,
      role: 'admin',
      ver: tokenVersion,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
    };
  }

  async logout(): Promise<LogoutResponseDto> {
    const now = new Date();
    await this.authStateModel
      .findOneAndUpdate(
        { key: ADMIN_AUTH_STATE_KEY },
        {
          $inc: { tokenVersion: 1 },
          $set: { revokedAt: now },
        },
        { upsert: true, new: true },
      )
      .exec();

    this.eventEmitter.emit(AUTH_LOGOUT_EVENT, {
      revokedAt: now.toISOString(),
    });

    return {
      revoked: true,
      revokedAt: now.toISOString(),
    };
  }
}
