import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

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
