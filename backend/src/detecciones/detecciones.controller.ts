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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EtiquetasApi } from '../common/constants/documentacion-api';
import {
  ApiDatosInvalidos,
  ApiNoEncontrado,
  ApiProtegido,
} from '../common/decorators/api-protegido.decorator';
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
@ApiTags(EtiquetasApi.LOCALIZACION_BLE)
@Controller('detecciones')
export class DeteccionesController {
  constructor(private readonly deteccionesService: DeteccionesService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Informar una detección de tag Bluetooth',
    description:
      'Endpoint público y anónimo a propósito: lo llama el celular de cualquier persona que pasa cerca de una mascota perdida, y no se identifica a quien detecta. Siempre responde 202 si el cuerpo está bien formado, se guarde la detección o no (tag sin vincular, mascota que no está perdida, detección repetida). Responder distinto permitiría averiguar qué tags existen probando identificadores.',
  })
  @ApiResponse({ status: 202, description: 'Detección recibida.' })
  @ApiDatosInvalidos('El cuerpo de la detección está mal formado.')
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
  @ApiProtegido()
  @ApiOperation({
    summary: 'Ver la última ubicación conocida de una mascota perdida',
    description:
      'A diferencia del POST, éste sí pide sesión: devuelve datos de una mascota concreta y sólo su dueño puede verlos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Última detección registrada.',
    type: UltimaDeteccionResponseDto,
  })
  @ApiNoEncontrado('El reporte no existe, no es de esta sesión, o todavía no hay detecciones.')
  buscarUltima(
    @CurrentUser() user: JwtPayload,
    @Param('idReporte', ParseIntPipe) idReporte: number,
  ): Promise<UltimaDeteccionResponseDto> {
    return this.deteccionesService.buscarUltimaDelReporte(idReporte, user.sub);
  }
}
