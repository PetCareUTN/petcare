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
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleName } from '../common/enums/role-name.enum';
import { TurnoServicioEstado } from '../common/enums/turno-servicio-estado.enum';
import { CancelarTurnoServicioDto } from './dto/cancelar-turno-servicio.dto';
import { CreateTurnoServicioDto } from './dto/create-turno-servicio.dto';
import { TurnosServiciosService } from './turnos-servicios.service';

@Controller('turnos-servicios')
export class TurnosServiciosController {
  constructor(private readonly turnosServiciosService: TurnosServiciosService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.DUENO_MASCOTA)
  @HttpCode(HttpStatus.CREATED)
  solicitar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTurnoServicioDto,
  ) {
    return this.turnosServiciosService.solicitar(user.sub, dto);
  }

  @Get('mios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.DUENO_MASCOTA)
  findMisReservas(
    @CurrentUser() user: JwtPayload,
    @Query('estado', new ParseEnumPipe(TurnoServicioEstado, { optional: true }))
    estado?: TurnoServicioEstado,
  ) {
    return this.turnosServiciosService.findMisReservas(user.sub, estado);
  }

  @Get('mias')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.DUENO_MASCOTA, RoleName.VETERINARIO)
  findRecibidas(
    @CurrentUser() user: JwtPayload,
    @Query('estado', new ParseEnumPipe(TurnoServicioEstado, { optional: true }))
    estado?: TurnoServicioEstado,
  ) {
    return this.turnosServiciosService.findRecibidas(user.sub, estado);
  }

  @Patch(':idTurno/cancelar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.DUENO_MASCOTA, RoleName.VETERINARIO)
  @HttpCode(HttpStatus.OK)
  cancelar(
    @CurrentUser() user: JwtPayload,
    @Param('idTurno', ParseIntPipe) idTurno: number,
    @Body() dto: CancelarTurnoServicioDto,
  ) {
    return this.turnosServiciosService.cancelar(user.sub, idTurno, dto);
  }
}
