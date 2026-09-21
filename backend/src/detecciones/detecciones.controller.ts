import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { DeteccionesService } from './detecciones.service';
import { RegistrarDeteccionDto } from './dto/registrar-deteccion.dto';

/**
 * Ingesta de detecciones BLE (US-31).
 *
 * **Anónimo a propósito**: no lleva JwtAuthGuard ni lee nada del request fuera
 * del body. El que detecta no tiene que quedar identificado. No es un olvido,
 * no agregarle el guard.
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
}
