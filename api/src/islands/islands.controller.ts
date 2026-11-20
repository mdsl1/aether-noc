import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IslandsResponseDto } from './dto/islands.dto';
import { IslandsService } from './islands.service';

@ApiTags('Islands')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('islands')
export class IslandsController {
  constructor(private readonly islandsService: IslandsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Retorna a topologia do arquipélago hidratada com o estado atual dos totens e status agregado das ilhas',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Topologia hidratada retornada com sucesso',
    type: IslandsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT ausente ou inválido',
  })
  getIslands(): Promise<IslandsResponseDto> {
    return this.islandsService.getIslands();
  }
}
