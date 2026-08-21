import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VeterinarioValidadoGuard } from '../auth/guards/veterinario-validado.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { RoleName } from '../common/enums/role-name.enum';
import { RechazarTurnoVeterinarioDto } from './dto/rechazar-turno-veterinario.dto';
import { TurnoVeterinarioResponseDto } from './dto/turno-veterinario-response.dto';
import { TurnosVeterinariosService } from './turnos-veterinarios.service';

@Controller('turnos-veterinarios')
@UseGuards(JwtAuthGuard, RolesGuard, VeterinarioValidadoGuard)
@Roles(RoleName.VETERINARIO)
export class TurnosVeterinariosController {
  constructor(
    private readonly turnosVeterinariosService: TurnosVeterinariosService,
  ) {}

  @Get('mia')
  findMine(
    @CurrentUser() user: JwtPayload,
    @Query('estado', new ParseEnumPipe(AppointmentStatus, { optional: true }))
    estado?: AppointmentStatus,
  ): Promise<TurnoVeterinarioResponseDto[]> {
    return this.turnosVeterinariosService.findMine(user.sub, estado);
  }

  @Patch(':idTurno/confirmar')
  @HttpCode(HttpStatus.OK)
  confirmar(
    @CurrentUser() user: JwtPayload,
    @Param('idTurno', ParseIntPipe) idTurno: number,
  ): Promise<TurnoVeterinarioResponseDto> {
    return this.turnosVeterinariosService.confirmar(user.sub, idTurno);
  }

  @Patch(':idTurno/rechazar')
  @HttpCode(HttpStatus.OK)
  rechazar(
    @CurrentUser() user: JwtPayload,
    @Param('idTurno', ParseIntPipe) idTurno: number,
    @Body() dto: RechazarTurnoVeterinarioDto,
  ): Promise<TurnoVeterinarioResponseDto> {
    return this.turnosVeterinariosService.rechazar(user.sub, idTurno, dto);
  }
}
