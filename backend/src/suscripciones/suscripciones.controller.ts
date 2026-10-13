import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EtiquetasApi } from '../common/constants/documentacion-api';
import {
  ApiNoEncontrado,
  ApiProtegido,
} from '../common/decorators/api-protegido.decorator';
import { RoleName } from '../common/enums/role-name.enum';
import { PagoResponseDto } from './dto/pago-response.dto';
import { SuscripcionResponseDto } from './dto/suscripcion-response.dto';
import { SuscripcionesService } from './suscripciones.service';

/**
 * Endpoints de suscripción para el veterinario.
 *
 * A propósito NO tienen chequeo extra de acceso: el vet sin suscripción (o
 * con la vencida) necesita poder consultar el estado y pagar. El chequeo
 * central vive en AccesoPlataformaInterceptor, que deja pasar estas rutas.
 */
@ApiTags(EtiquetasApi.MEMBRESIAS)
@Controller('suscripciones')
export class SuscripcionesController {
  constructor(private readonly suscripcionesService: SuscripcionesService) {}

  @Get('mia')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @ApiProtegido(RoleName.VETERINARIO)
  @ApiOperation({
    summary: 'Ver el estado de mi suscripción',
    description:
      'Se puede consultar aunque la suscripción esté vencida: el veterinario necesita ver su estado para poder regularizarlo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de la suscripción.',
    type: SuscripcionResponseDto,
  })
  obtenerMia(@CurrentUser() user: JwtPayload): Promise<SuscripcionResponseDto> {
    return this.suscripcionesService.obtenerMia(user.sub);
  }

  @Post('suscribirme')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @HttpCode(HttpStatus.OK)
  @ApiProtegido(RoleName.VETERINARIO)
  @ApiOperation({
    summary: 'Iniciar la suscripción',
    description:
      'Devuelve initPoint, la URL del checkout de Mercado Pago a la que hay que mandar al navegador. La suscripción recién queda activa cuando Mercado Pago confirma el pago por el webhook.',
  })
  @ApiResponse({ status: 200, description: 'Checkout creado, con su URL de pago.' })
  suscribirme(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ initPoint: string; suscripcion: SuscripcionResponseDto }> {
    return this.suscripcionesService.suscribirme(user.sub);
  }

  @Get('historial')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @ApiProtegido(RoleName.VETERINARIO)
  @ApiOperation({ summary: 'Ver el historial de pagos de mi suscripción' })
  @ApiResponse({
    status: 200,
    description: 'Pagos registrados.',
    type: [PagoResponseDto],
  })
  historial(@CurrentUser() user: JwtPayload): Promise<PagoResponseDto[]> {
    return this.suscripcionesService.historial(user.sub);
  }

  /**
   * Webhook de Mercado Pago: no lleva guards porque lo llama MP, no un
   * usuario. La autenticación es la firma (x-signature + MP_WEBHOOK_SECRET).
   *
   * Body/query sin DTO validado a propósito: MP manda campos extra que el
   * ValidationPipe global (whitelist + forbidNonWhitelisted) rechazaría.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook de Mercado Pago (no lo consume el frontend)',
    description:
      'Lo llama Mercado Pago, no la web ni la app: no hay que integrarlo desde el frontend. No lleva token porque quien lo invoca no es un usuario; se autentica con la firma del header x-signature contra MP_WEBHOOK_SECRET. El cuerpo no se valida con un DTO a propósito, porque Mercado Pago manda campos extra que el ValidationPipe global rechazaría. Responde 200 siempre que procese el aviso, para que Mercado Pago no lo reintente.',
  })
  @ApiResponse({ status: 200, description: 'Aviso procesado.' })
  manejarWebhook(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query() query: Record<string, unknown>,
    @Body() body: Record<string, unknown>,
  ): Promise<{ ok: true }> {
    return this.suscripcionesService.manejarWebhook(headers, query, body);
  }

  /**
   * Retorno del checkout de Mercado Pago (back_url pública del backend, p.
   * ej. la URL del túnel ngrok). MP devuelve al navegador acá y este
   * endpoint lo redirige al frontend de desarrollo, que sí corre en la
   * máquina del usuario. Sin guards: lo abre el navegador sin header
   * Authorization (mismo criterio que el webhook). El destino sale de la
   * configuración (urlRetornoFrontend), nunca del request.
   */
  @Get('retorno')
  @ApiOperation({
    summary: 'Retorno del checkout de Mercado Pago',
    description:
      'Tampoco lo consume el frontend: es la dirección a la que Mercado Pago devuelve el navegador al terminar el pago. Redirige al frontend configurado. Sin token, porque el navegador llega sin header Authorization.',
  })
  @ApiResponse({ status: 302, description: 'Redirección al frontend.' })
  retorno(@Res() res: Response): void {
    res.redirect(
      HttpStatus.FOUND,
      this.suscripcionesService.urlRetornoFrontend(),
    );
  }
}

/** Panel de administración de suscripciones. */
@ApiTags(EtiquetasApi.ADMINISTRACION)
@ApiProtegido(RoleName.ADMINISTRADOR)
@Controller('admin')
export class SuscripcionesAdminController {
  constructor(private readonly suscripcionesService: SuscripcionesService) {}

  @Get('suscripciones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar las suscripciones de todas las veterinarias' })
  @ApiResponse({
    status: 200,
    description: 'Suscripciones con su estado.',
    type: [SuscripcionResponseDto],
  })
  listar(): Promise<SuscripcionResponseDto[]> {
    return this.suscripcionesService.listarAdmin();
  }

  @Get('suscripciones/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Ver el detalle de una suscripción',
    description: 'Con el historial de pagos de esa veterinaria.',
  })
  @ApiResponse({ status: 200, description: 'Suscripción y sus pagos.' })
  @ApiNoEncontrado('La suscripción no existe.')
  detalle(@Param('id', ParseIntPipe) id: number): Promise<{
    suscripcion: SuscripcionResponseDto;
    pagos: PagoResponseDto[];
  }> {
    return this.suscripcionesService.detalleAdmin(id);
  }
}
