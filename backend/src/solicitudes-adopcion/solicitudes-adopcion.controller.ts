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
import { CreateSolicitudAdopcionDto } from './dto/create-solicitud-adopcion.dto';
import { RechazarSolicitudAdopcionDto } from './dto/rechazar-solicitud-adopcion.dto';
import { SolicitudAdopcionResponseDto } from './dto/solicitud-adopcion-response.dto';
import { SolicitudesAdopcionService } from './solicitudes-adopcion.service';

@Controller('solicitudes-adopcion')
export class SolicitudesAdopcionController {
  constructor(
    private readonly solicitudesAdopcionService: SolicitudesAdopcionService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  solicitar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSolicitudAdopcionDto,
  ): Promise<SolicitudAdopcionResponseDto> {
    return this.solicitudesAdopcionService.solicitar(user.sub, dto);
  }

  @Get('recibidas')
  @UseGuards(JwtAuthGuard)
  findRecibidas(
    @CurrentUser() user: JwtPayload,
  ): Promise<SolicitudAdopcionResponseDto[]> {
    return this.solicitudesAdopcionService.findRecibidas(user.sub);
  }

  @Patch(':id/aceptar')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  aceptar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SolicitudAdopcionResponseDto> {
    return this.solicitudesAdopcionService.aceptar(user.sub, id);
  }

  @Patch(':id/rechazar')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  rechazar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarSolicitudAdopcionDto,
  ): Promise<SolicitudAdopcionResponseDto> {
    return this.solicitudesAdopcionService.rechazar(user.sub, id, dto);
  }
}
