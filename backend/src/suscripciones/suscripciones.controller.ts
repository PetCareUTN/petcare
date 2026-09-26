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
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
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
@Controller('suscripciones')
export class SuscripcionesController {
  constructor(private readonly suscripcionesService: SuscripcionesService) {}

  @Get('mia')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  obtenerMia(@CurrentUser() user: JwtPayload): Promise<SuscripcionResponseDto> {
    return this.suscripcionesService.obtenerMia(user.sub);
  }

  @Post('suscribirme')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @HttpCode(HttpStatus.OK)
  suscribirme(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ initPoint: string; suscripcion: SuscripcionResponseDto }> {
    return this.suscripcionesService.suscribirme(user.sub);
  }

  @Get('historial')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
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
  retorno(@Res() res: Response): void {
    res.redirect(
      HttpStatus.FOUND,
      this.suscripcionesService.urlRetornoFrontend(),
    );
  }
}

/** Panel de administración de suscripciones. */
@Controller('admin')
export class SuscripcionesAdminController {
  constructor(private readonly suscripcionesService: SuscripcionesService) {}

  @Get('suscripciones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMINISTRADOR)
  listar(): Promise<SuscripcionResponseDto[]> {
    return this.suscripcionesService.listarAdmin();
  }

  @Get('suscripciones/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMINISTRADOR)
  detalle(@Param('id', ParseIntPipe) id: number): Promise<{
    suscripcion: SuscripcionResponseDto;
    pagos: PagoResponseDto[];
  }> {
    return this.suscripcionesService.detalleAdmin(id);
  }
}
