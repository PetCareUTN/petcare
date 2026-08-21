import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleName } from '../common/enums/role-name.enum';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { TurnoResponseDto } from './dto/turno-response.dto';
import { TurnosService } from './turnos.service';

@Controller('turnos')
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.DUENO_MASCOTA)
  @HttpCode(HttpStatus.CREATED)
  solicitar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTurnoDto,
  ): Promise<TurnoResponseDto> {
    return this.turnosService.solicitar(user.sub, dto);
  }
}
