import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Delete,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EtiquetasApi } from '../common/constants/documentacion-api';
import {
  ApiNoEncontrado,
  ApiProtegido,
} from '../common/decorators/api-protegido.decorator';
import { TagsBleService } from '../tags-ble/tags-ble.service';
import { AvisarSeparacionDto } from './dto/avisar-separacion.dto';
import { RegistrarDispositivoDto } from './dto/registrar-dispositivo.dto';
import { DispositivosPushService } from './dispositivos-push.service';
import { NotificacionesSeparacionService } from './notificaciones-separacion.service';
import { NotificacionesService } from './notificaciones.service';

@ApiTags(EtiquetasApi.NOTIFICACIONES)
@ApiProtegido()
@Controller('notificaciones')
export class NotificacionesController {
  constructor(
    private readonly notificacionesService: NotificacionesService,
    private readonly notificacionesSeparacionService: NotificacionesSeparacionService,
    private readonly dispositivosPushService: DispositivosPushService,
    private readonly tagsBleService: TagsBleService,
  ) {}

  /**
   * Deja en el historial el aviso de que una mascota se alejó (US-34).
   *
   * A diferencia de la ingesta de detecciones, que es anónima, este endpoint
   * **sí** exige sesión: el aviso es para el dueño, y solo él monitorea sus
   * propias mascotas. `buscarMascotaPorTag` valida además que el tag sea de una
   * mascota suya, así conocer un tagId ajeno —que viaja en claro en el frame—
   * no alcanza para generarle avisos a otro.
   */
  @Post('separacion')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Avisar que una mascota se alejó',
    description:
      'Lo llama la app del dueño cuando deja de ver el tag de su mascota. Pide sesión y valida que el tag sea de una mascota propia, así conocer un tagId ajeno no alcanza para generarle avisos a otra persona. Devuelve creada: false si el aviso se omitió por repetido.',
  })
  @ApiResponse({ status: 201, description: 'Aviso procesado.' })
  @ApiNoEncontrado('Ese tag no corresponde a una mascota de esta sesión.')
  async avisarSeparacion(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AvisarSeparacionDto,
  ): Promise<{ creada: boolean }> {
    const mascota = await this.tagsBleService.buscarMascotaPorTag(
      user.sub,
      dto.tagId,
    );

    const creada =
      await this.notificacionesSeparacionService.notificarSeparacion({
        idUsuario: user.sub,
        idMascota: mascota.idMascota,
        nombreMascota: mascota.nombre ?? null,
      });

    return { creada };
  }

  /**
   * Registra el dispositivo para recibir push. La app lo llama al iniciar
   * sesión, cada vez: el token de FCM se renueva solo y hay que guardar el
   * último.
   */
  @Post('dispositivos')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Registrar este dispositivo para notificaciones push',
    description:
      'Guarda el token de FCM del dispositivo para la sesión actual. Si el token ya estaba registrado por otra cuenta, pasa a esta: es el mismo teléfono cambiando de usuario.',
  })
  @ApiResponse({ status: 204, description: 'Dispositivo registrado.' })
  async registrarDispositivo(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegistrarDispositivoDto,
  ): Promise<void> {
    await this.dispositivosPushService.registrar(
      user.sub,
      dto.token,
      dto.plataforma,
    );
  }

  /**
   * Da de baja el dispositivo al cerrar sesión, para que no le sigan llegando
   * avisos de una cuenta que ya no tiene la sesión abierta.
   */
  @Delete('dispositivos')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Dar de baja este dispositivo',
    description:
      'La app lo llama al cerrar sesión. Solo da de baja dispositivos de la propia sesión.',
  })
  @ApiResponse({ status: 204, description: 'Dispositivo dado de baja.' })
  async eliminarDispositivo(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegistrarDispositivoDto,
  ): Promise<void> {
    await this.dispositivosPushService.eliminar(user.sub, dto.token);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Listar mis notificaciones',
    description: 'Las más nuevas primero, con su marca de leída o no leída.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notificaciones de la sesión actual.',
  })
  listar(@CurrentUser() user: JwtPayload) {
    return this.notificacionesService.listarPorUsuario(user.sub);
  }

  /** Va antes de ':id/leer' para que 'leer-todas' no entre como id. */
  @Patch('leer-todas')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar todas mis notificaciones como leídas' })
  @ApiResponse({
    status: 200,
    description: 'Notificaciones marcadas como leídas.',
  })
  marcarTodasLeidas(@CurrentUser() user: JwtPayload) {
    return this.notificacionesService.marcarTodasLeidas(user.sub);
  }

  @Patch(':id/leer')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  @ApiResponse({ status: 200, description: 'Notificación marcada como leída.' })
  @ApiNoEncontrado('La notificación no existe o no es de esta sesión.')
  marcarLeida(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificacionesService.marcarLeida(id, user.sub);
  }
}
