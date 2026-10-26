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
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EtiquetasApi } from '../common/constants/documentacion-api';
import {
  ApiConflicto,
  ApiNoEncontrado,
  ApiProtegido,
} from '../common/decorators/api-protegido.decorator';
import { RoleName } from '../common/enums/role-name.enum';
import { TurnoServicioEstado } from '../common/enums/turno-servicio-estado.enum';
import { AgendarTurnoServicioDto } from './dto/agendar-turno-servicio.dto';
import { CancelarTurnoServicioDto } from './dto/cancelar-turno-servicio.dto';
import { CreateTurnoServicioDto } from './dto/create-turno-servicio.dto';
import { TurnosServiciosService } from './turnos-servicios.service';

@ApiTags(EtiquetasApi.TURNOS)
@ApiProtegido()
@Controller('turnos-servicios')
export class TurnosServiciosController {
  constructor(private readonly turnosServiciosService: TurnosServiciosService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.DUENO_MASCOTA)
  @HttpCode(HttpStatus.CREATED)
  @ApiProtegido(RoleName.DUENO_MASCOTA)
  @ApiOperation({
    summary: 'Reservar un turno de servicio',
    description:
      'Para paseador, guardería o peluquería. El horario tiene que ser uno de los que devuelve GET /turnos-servicios/horarios-disponibles.',
  })
  @ApiResponse({ status: 201, description: 'Turno reservado.' })
  @ApiConflicto('Ese horario ya está ocupado o quedó fuera de la disponibilidad.')
  @ApiNoEncontrado('El servicio o la mascota no existen.')
  solicitar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTurnoServicioDto,
  ) {
    return this.turnosServiciosService.solicitar(user.sub, dto);
  }

  @Post('mia')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @HttpCode(HttpStatus.CREATED)
  @ApiProtegido(RoleName.VETERINARIO)
  @ApiOperation({
    summary: 'Agendar un turno de servicio para un cliente',
    description:
      'El prestador carga la reserva sobre uno de sus servicios. El horario tiene que ser uno de los libres que devuelve GET /turnos-servicios/horarios-disponibles; el cliente recibe un aviso.',
  })
  @ApiResponse({ status: 201, description: 'Turno agendado.' })
  @ApiConflicto('Ese horario ya está ocupado o quedó fuera de la disponibilidad.')
  @ApiNoEncontrado('El servicio o la mascota no existen.')
  agendarComoPrestador(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AgendarTurnoServicioDto,
  ) {
    return this.turnosServiciosService.agendarComoPrestador(user.sub, dto);
  }

  @Get('horarios-disponibles')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Ver los horarios libres de un servicio en un día',
  })
  @ApiQuery({ name: 'idServicio', example: 1 })
  @ApiQuery({ name: 'fecha', example: '2026-10-20', description: 'Fecha en formato AAAA-MM-DD.' })
  @ApiResponse({
    status: 200,
    description: 'Horarios libres, en formato HH:mm.',
    type: [String],
  })
  horariosDisponibles(
    @Query('idServicio', ParseIntPipe) idServicio: number,
    @Query('fecha') fecha: string,
  ) {
    return this.turnosServiciosService.horariosDisponibles(idServicio, fecha);
  }

  @Get('mios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.DUENO_MASCOTA)
  @ApiProtegido(RoleName.DUENO_MASCOTA)
  @ApiOperation({ summary: 'Listar los turnos de servicio que reservé' })
  @ApiQuery({ name: 'estado', required: false, enum: TurnoServicioEstado })
  @ApiResponse({ status: 200, description: 'Reservas de la sesión actual.' })
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
  @ApiOperation({
    summary: 'Listar los turnos que recibí como prestador',
    description: 'Las reservas que otras personas hicieron sobre mis servicios.',
  })
  @ApiQuery({ name: 'estado', required: false, enum: TurnoServicioEstado })
  @ApiResponse({ status: 200, description: 'Reservas recibidas.' })
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
  @ApiOperation({
    summary: 'Cancelar un turno de servicio',
    description: 'Lo pueden cancelar tanto quien reservó como el prestador.',
  })
  @ApiResponse({ status: 200, description: 'Turno cancelado.' })
  @ApiConflicto('El turno ya estaba cancelado o finalizado.')
  @ApiNoEncontrado('El turno no existe o no es de esta sesión.')
  cancelar(
    @CurrentUser() user: JwtPayload,
    @Param('idTurno', ParseIntPipe) idTurno: number,
    @Body() dto: CancelarTurnoServicioDto,
  ) {
    return this.turnosServiciosService.cancelar(user.sub, idTurno, dto);
  }
}
