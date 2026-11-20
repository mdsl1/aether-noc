import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

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

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '7d');
    const payload: JwtPayload = { sub: adminUsername, role: 'admin' };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
    };
  }
}
