import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { DeteccionesService } from './detecciones.service';
import { RegistrarDeteccionDto } from './dto/registrar-deteccion.dto';
import { UltimaDeteccionResponseDto } from './dto/ultima-deteccion-response.dto';

/**
 * Ingesta de detecciones BLE (US-31).
 *
 * **La ingesta (POST) es anónima a propósito**: no lleva JwtAuthGuard ni lee
 * nada del request fuera del body. El que detecta no tiene que quedar
 * identificado. No es un olvido, no agregarle el guard. (La consulta de US-37
 * que está más abajo sí va autenticada: ahí se leen datos de una mascota.)
 *
 * **Siempre 202 para una detección bien formada**, se guarde o no (tag no
 * vinculado, mascota que no está perdida, duplicada). Dos motivos:
 *
 * - Como no hay autenticación, responder distinto dejaría a cualquiera averiguar
 *   qué tags existen y qué mascotas están perdidas probando instance IDs.
 * - El celular reintenta lo que no recibe con 2xx. Un 404 por un tag ajeno lo
 *   haría reintentar eternamente una lectura que nunca va a servir.
 *
 * Solo un request mal formado recibe 400 (lo arma el ValidationPipe global).
 */
@Controller('detecciones')
export class DeteccionesController {
  constructor(private readonly deteccionesService: DeteccionesService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async registrar(@Body() dto: RegistrarDeteccionDto): Promise<void> {
    await this.deteccionesService.registrar(dto);
  }

  /**
   * Última ubicación conocida de una mascota perdida (US-37).
   *
   * A diferencia del POST de arriba, este endpoint **sí** va autenticado: acá
   * se leen datos de una mascota concreta y solo su dueño puede verlos. El
   * anonimato de US-31 protege a quien detecta, no a quien consulta.
   */
  @Get('reporte/:idReporte/ultima')
  @UseGuards(JwtAuthGuard)
  buscarUltima(
    @CurrentUser() user: JwtPayload,
    @Param('idReporte', ParseIntPipe) idReporte: number,
  ): Promise<UltimaDeteccionResponseDto> {
    return this.deteccionesService.buscarUltimaDelReporte(idReporte, user.sub);
  }
}
