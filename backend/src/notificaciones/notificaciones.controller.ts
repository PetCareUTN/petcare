import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { TagsBleService } from '../tags-ble/tags-ble.service';
import { AvisarSeparacionDto } from './dto/avisar-separacion.dto';
import { NotificacionesSeparacionService } from './notificaciones-separacion.service';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(
    private readonly notificacionesService: NotificacionesService,
    private readonly notificacionesSeparacionService: NotificacionesSeparacionService,
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

  @Get()
  @UseGuards(JwtAuthGuard)
  listar(@CurrentUser() user: JwtPayload) {
    return this.notificacionesService.listarPorUsuario(user.sub);
  }

  /** Va antes de ':id/leer' para que 'leer-todas' no entre como id. */
  @Patch('leer-todas')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  marcarTodasLeidas(@CurrentUser() user: JwtPayload) {
    return this.notificacionesService.marcarTodasLeidas(user.sub);
  }

  @Patch(':id/leer')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  marcarLeida(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificacionesService.marcarLeida(id, user.sub);
  }
}
