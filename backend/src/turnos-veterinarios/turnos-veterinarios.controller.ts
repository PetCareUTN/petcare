import {
  Body,
  Controller,
  Delete,
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
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
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
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { RoleName } from '../common/enums/role-name.enum';
import { AgendarTurnoVeterinarioDto } from './dto/agendar-turno-veterinario.dto';
import { CancelarTurnoVeterinarioDto } from './dto/cancelar-turno-veterinario.dto';
import { CapacidadHorarioResponseDto } from './dto/capacidad-horario-response.dto';
import { CreateTurnoVeterinarioDto } from './dto/create-turno-veterinario.dto';
import { RegistrarAsistenciaDto } from './dto/registrar-asistencia.dto';
import { TurnoDuenioResponseDto } from './dto/turno-duenio-response.dto';
import { TurnoVeterinarioResponseDto } from './dto/turno-veterinario-response.dto';
import { TurnosVeterinariosService } from './turnos-veterinarios.service';

@ApiTags(EtiquetasApi.TURNOS)
@ApiProtegido()
@Controller('turnos-veterinarios')
export class TurnosVeterinariosController {
  constructor(
    private readonly turnosVeterinariosService: TurnosVeterinariosService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.DUENO_MASCOTA)
  @HttpCode(HttpStatus.CREATED)
  @ApiProtegido(RoleName.DUENO_MASCOTA)
  @ApiOperation({
    summary: 'Pedir un turno en una veterinaria',
    description:
      'La fecha y hora tienen que ser uno de los horarios que devuelve GET /turnos-veterinarios/horarios-disponibles.',
  })
  @ApiResponse({
    status: 201,
    description: 'Turno solicitado.',
    type: TurnoVeterinarioResponseDto,
  })
  @ApiConflicto(
    'Ese horario ya está ocupado o quedó fuera de la disponibilidad.',
  )
  @ApiNoEncontrado('La veterinaria o la mascota no existen.')
  solicitar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTurnoVeterinarioDto,
  ): Promise<TurnoVeterinarioResponseDto> {
    return this.turnosVeterinariosService.solicitar(user.sub, dto);
  }

  @Get('horarios-disponibles')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Ver los horarios libres de una veterinaria en un día',
    description:
      'Descuenta de la disponibilidad los turnos ya tomados. Es lo que llena el selector de hora.',
  })
  @ApiQuery({ name: 'idVeterinario', example: 2 })
  @ApiQuery({
    name: 'fecha',
    example: '2026-10-20',
    description: 'Fecha en formato AAAA-MM-DD.',
  })
  @ApiResponse({
    status: 200,
    description: 'Horarios libres, en formato HH:mm.',
    type: [String],
  })
  horariosDisponibles(
    @Query('idVeterinario', ParseIntPipe) idVeterinario: number,
    @Query('fecha') fecha: string,
  ): Promise<string[]> {
    return this.turnosVeterinariosService.horariosDisponibles(
      idVeterinario,
      fecha,
    );
  }

  @Get('mia')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @ApiProtegido(RoleName.VETERINARIO)
  @ApiOperation({
    summary: 'Listar los turnos de mi veterinaria',
    description: 'Se puede filtrar por estado del turno.',
  })
  @ApiQuery({ name: 'estado', required: false, enum: AppointmentStatus })
  @ApiResponse({
    status: 200,
    description: 'Turnos recibidos por la veterinaria.',
    type: [TurnoVeterinarioResponseDto],
  })
  findMine(
    @CurrentUser() user: JwtPayload,
    @Query('estado', new ParseEnumPipe(AppointmentStatus, { optional: true }))
    estado?: AppointmentStatus,
  ): Promise<TurnoVeterinarioResponseDto[]> {
    return this.turnosVeterinariosService.findMine(user.sub, estado);
  }

  @Post('mia')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @HttpCode(HttpStatus.CREATED)
  @ApiProtegido(RoleName.VETERINARIO)
  @ApiOperation({
    summary: 'Agendar un turno desde la veterinaria',
    description:
      'El veterinario carga un turno para la mascota de un cliente, dentro de su horario de atención o sus sobreturnos. Si el horario ya no tiene cupos responde 409 con codigo CUPO_LLENO; repitiendo con forzar=true se agenda igual como sobrecupo.',
  })
  @ApiResponse({
    status: 201,
    description: 'Turno agendado.',
    type: TurnoVeterinarioResponseDto,
  })
  @ApiConflicto('El horario no tiene cupos y falta confirmar con forzar.')
  @ApiNoEncontrado('La mascota no existe.')
  agendarComoVeterinario(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AgendarTurnoVeterinarioDto,
  ): Promise<TurnoVeterinarioResponseDto> {
    return this.turnosVeterinariosService.agendarComoVeterinario(user.sub, dto);
  }

  @Get('mia/agenda')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @ApiProtegido(RoleName.VETERINARIO)
  @ApiOperation({
    summary: 'Capacidad y ocupación de mi agenda',
    description:
      'Franjas de 30 minutos con sus cupos de atención y de sobreturno y los turnos que las ocupan, para un rango de hasta 62 días.',
  })
  @ApiQuery({ name: 'desde', example: '2026-10-19' })
  @ApiQuery({ name: 'hasta', example: '2026-10-25' })
  @ApiResponse({
    status: 200,
    description: 'Franjas con cupos o turnos en el rango.',
    type: [CapacidadHorarioResponseDto],
  })
  capacidadAgenda(
    @CurrentUser() user: JwtPayload,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ): Promise<CapacidadHorarioResponseDto[]> {
    return this.turnosVeterinariosService.capacidadAgenda(
      user.sub,
      desde,
      hasta,
    );
  }

  @Get('mios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.DUENO_MASCOTA)
  @ApiProtegido(RoleName.DUENO_MASCOTA)
  @ApiOperation({ summary: 'Listar los turnos que pedí' })
  @ApiQuery({ name: 'estado', required: false, enum: AppointmentStatus })
  @ApiResponse({
    status: 200,
    description: 'Turnos de la sesión actual.',
    type: [TurnoDuenioResponseDto],
  })
  findMisTurnos(
    @CurrentUser() user: JwtPayload,
    @Query('estado', new ParseEnumPipe(AppointmentStatus, { optional: true }))
    estado?: AppointmentStatus,
  ): Promise<TurnoDuenioResponseDto[]> {
    return this.turnosVeterinariosService.findMisTurnos(user.sub, estado);
  }

  @Patch(':idTurno/cancelar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.DUENO_MASCOTA, RoleName.VETERINARIO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancelar un turno',
    description:
      'Lo pueden cancelar tanto el dueño como la veterinaria, indicando el motivo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Turno cancelado.',
    type: TurnoVeterinarioResponseDto,
  })
  @ApiConflicto('El turno ya estaba cancelado o finalizado.')
  @ApiNoEncontrado('El turno no existe o no es de esta sesión.')
  cancelar(
    @CurrentUser() user: JwtPayload,
    @Param('idTurno', ParseIntPipe) idTurno: number,
    @Body() dto: CancelarTurnoVeterinarioDto,
  ): Promise<TurnoVeterinarioResponseDto> {
    return this.turnosVeterinariosService.cancelar(user.sub, idTurno, dto);
  }

  /**
   * A diferencia de cancelar, acá solo entra el veterinario: la asistencia la
   * constata quien atiende, no el dueño que reservó.
   */
  @Patch(':idTurno/asistencia')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar si el cliente se presentó al turno',
    description:
      'Cierra el turno como asistido o ausente. Solo el veterinario del turno, y solo una vez que el turno empezó.',
  })
  @ApiResponse({
    status: 200,
    description: 'Asistencia registrada.',
    type: TurnoVeterinarioResponseDto,
  })
  @ApiNoEncontrado('El turno no existe o no es de esta sesión.')
  registrarAsistencia(
    @CurrentUser() user: JwtPayload,
    @Param('idTurno', ParseIntPipe) idTurno: number,
    @Body() dto: RegistrarAsistenciaDto,
  ): Promise<TurnoVeterinarioResponseDto> {
    return this.turnosVeterinariosService.registrarAsistencia(
      user.sub,
      idTurno,
      dto,
    );
  }

  @Delete(':idTurno/asistencia')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Corregir la asistencia registrada',
    description:
      'Vuelve el turno a confirmado. Solo el mismo día del turno, para corregir una marca equivocada.',
  })
  @ApiResponse({
    status: 200,
    description: 'Asistencia revertida.',
    type: TurnoVeterinarioResponseDto,
  })
  @ApiNoEncontrado('El turno no existe o no es de esta sesión.')
  revertirAsistencia(
    @CurrentUser() user: JwtPayload,
    @Param('idTurno', ParseIntPipe) idTurno: number,
  ): Promise<TurnoVeterinarioResponseDto> {
    return this.turnosVeterinariosService.revertirAsistencia(user.sub, idTurno);
  }
}
