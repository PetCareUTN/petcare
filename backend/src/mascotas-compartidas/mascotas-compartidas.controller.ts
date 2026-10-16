import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EtiquetasApi } from '../common/constants/documentacion-api';
import {
  ApiConflicto,
  ApiDatosInvalidos,
  ApiNoEncontrado,
  ApiProtegido,
} from '../common/decorators/api-protegido.decorator';
import { CrearSolicitudCompartirDto } from './dto/crear-solicitud-compartir.dto';
import { DuenoMascotaResponseDto } from './dto/dueno-mascota-response.dto';
import { SolicitudCompartirResponseDto } from './dto/solicitud-compartir-response.dto';
import { UsuarioEncontradoResponseDto } from './dto/usuario-encontrado-response.dto';
import { MascotasCompartidasService } from './mascotas-compartidas.service';

@ApiTags(EtiquetasApi.MASCOTAS)
@ApiProtegido()
@Controller('mascotas-compartidas')
@UseGuards(JwtAuthGuard)
export class MascotasCompartidasController {
  constructor(
    private readonly mascotasCompartidasService: MascotasCompartidasService,
  ) {}

  @Get('buscar-usuario')
  @ApiOperation({
    summary: 'Buscar a la persona con la que compartir una mascota',
    description:
      'Por email o DNI. Devuelve solo el nombre parcial (por ejemplo "Marta G.") para confirmar que es la persona correcta.',
  })
  @ApiQuery({ name: 'email', required: false, example: 'marta@example.com' })
  @ApiQuery({ name: 'documento', required: false, example: '30123456' })
  @ApiResponse({
    status: 200,
    description: 'Persona encontrada.',
    type: UsuarioEncontradoResponseDto,
  })
  @ApiDatosInvalidos('No se indicó email ni DNI, o es el de la propia sesión.')
  @ApiNoEncontrado('No hay ningún dueño de mascotas con ese dato.')
  buscarUsuario(
    @CurrentUser() user: JwtPayload,
    @Query('email') email?: string,
    @Query('documento') documento?: string,
  ): Promise<UsuarioEncontradoResponseDto> {
    return this.mascotasCompartidasService.buscarUsuario(
      user.sub,
      email,
      documento,
    );
  }

  @Post('solicitudes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Compartir una mascota con otra persona',
    description:
      'Solo lo puede hacer quien registró la mascota. La otra persona recibe una notificación y decide si acepta.',
  })
  @ApiResponse({
    status: 201,
    description: 'Solicitud enviada.',
    type: SolicitudCompartirResponseDto,
  })
  @ApiConflicto('Ya es dueña de la mascota o ya hay una solicitud pendiente.')
  @ApiNoEncontrado('La mascota o la persona no existen.')
  solicitar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CrearSolicitudCompartirDto,
  ): Promise<SolicitudCompartirResponseDto> {
    return this.mascotasCompartidasService.solicitar(user.sub, dto);
  }

  @Get('solicitudes/recibidas')
  @ApiOperation({ summary: 'Solicitudes pendientes que me hicieron' })
  @ApiResponse({
    status: 200,
    description: 'Solicitudes para aceptar o rechazar.',
    type: [SolicitudCompartirResponseDto],
  })
  listarRecibidas(
    @CurrentUser() user: JwtPayload,
  ): Promise<SolicitudCompartirResponseDto[]> {
    return this.mascotasCompartidasService.listarRecibidas(user.sub);
  }

  @Get('solicitudes/enviadas')
  @ApiOperation({
    summary: 'Solicitudes pendientes que hice',
    description: 'Se puede filtrar por mascota con idMascota.',
  })
  @ApiQuery({ name: 'idMascota', required: false, example: 12 })
  @ApiResponse({
    status: 200,
    description: 'Solicitudes que todavía no respondieron.',
    type: [SolicitudCompartirResponseDto],
  })
  listarEnviadas(
    @CurrentUser() user: JwtPayload,
    @Query('idMascota') idMascota?: string,
  ): Promise<SolicitudCompartirResponseDto[]> {
    const id = idMascota ? Number(idMascota) : undefined;
    return this.mascotasCompartidasService.listarEnviadas(
      user.sub,
      id && Number.isInteger(id) ? id : undefined,
    );
  }

  @Post('solicitudes/:idSolicitud/aceptar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aceptar una solicitud para compartir',
    description:
      'Desde ese momento la mascota aparece en tu cuenta con todos sus datos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud aceptada.',
    type: SolicitudCompartirResponseDto,
  })
  @ApiConflicto('La solicitud ya fue respondida o cancelada.')
  @ApiNoEncontrado('La solicitud no existe o no es para esta sesión.')
  aceptar(
    @CurrentUser() user: JwtPayload,
    @Param('idSolicitud', ParseIntPipe) idSolicitud: number,
  ): Promise<SolicitudCompartirResponseDto> {
    return this.mascotasCompartidasService.aceptar(idSolicitud, user.sub);
  }

  @Post('solicitudes/:idSolicitud/rechazar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rechazar una solicitud para compartir' })
  @ApiResponse({
    status: 200,
    description: 'Solicitud rechazada.',
    type: SolicitudCompartirResponseDto,
  })
  @ApiConflicto('La solicitud ya fue respondida o cancelada.')
  @ApiNoEncontrado('La solicitud no existe o no es para esta sesión.')
  rechazar(
    @CurrentUser() user: JwtPayload,
    @Param('idSolicitud', ParseIntPipe) idSolicitud: number,
  ): Promise<SolicitudCompartirResponseDto> {
    return this.mascotasCompartidasService.rechazar(idSolicitud, user.sub);
  }

  @Delete('solicitudes/:idSolicitud')
  @ApiOperation({
    summary: 'Cancelar una solicitud que todavía no respondieron',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud cancelada.',
    type: SolicitudCompartirResponseDto,
  })
  @ApiConflicto('La solicitud ya fue respondida o cancelada.')
  @ApiNoEncontrado('La solicitud no existe o no la hiciste vos.')
  cancelar(
    @CurrentUser() user: JwtPayload,
    @Param('idSolicitud', ParseIntPipe) idSolicitud: number,
  ): Promise<SolicitudCompartirResponseDto> {
    return this.mascotasCompartidasService.cancelar(idSolicitud, user.sub);
  }

  @Get('mascotas/:idMascota/duenos')
  @ApiOperation({
    summary: 'Listar los dueños de una mascota',
    description: 'Lo puede ver cualquiera de sus dueños.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dueños en el orden en que se sumaron.',
    type: [DuenoMascotaResponseDto],
  })
  listarDuenios(
    @CurrentUser() user: JwtPayload,
    @Param('idMascota', ParseIntPipe) idMascota: number,
  ): Promise<DuenoMascotaResponseDto[]> {
    return this.mascotasCompartidasService.listarDuenios(user.sub, idMascota);
  }

  @Post('mascotas/:idMascota/salir')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Dejar de ver una mascota compartida',
    description:
      'Para los demás dueños la mascota sigue existiendo. Si te vas siendo el dueño principal, pasa a serlo el que se sumó primero. El único dueño no puede irse.',
  })
  @ApiResponse({ status: 204, description: 'Ya no ves la mascota.' })
  @ApiConflicto('Sos el único dueño de la mascota.')
  salir(
    @CurrentUser() user: JwtPayload,
    @Param('idMascota', ParseIntPipe) idMascota: number,
  ): Promise<void> {
    return this.mascotasCompartidasService.salir(user.sub, idMascota);
  }

  @Delete('mascotas/:idMascota/duenos/:idUsuario')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Dejar de compartir una mascota con un dueño',
    description: 'Solo lo puede hacer el dueño principal.',
  })
  @ApiResponse({ status: 204, description: 'La persona ya no ve la mascota.' })
  @ApiNoEncontrado('Esa persona no es dueña de la mascota.')
  quitarDuenio(
    @CurrentUser() user: JwtPayload,
    @Param('idMascota', ParseIntPipe) idMascota: number,
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
  ): Promise<void> {
    return this.mascotasCompartidasService.quitarDuenio(
      user.sub,
      idMascota,
      idUsuario,
    );
  }
}
