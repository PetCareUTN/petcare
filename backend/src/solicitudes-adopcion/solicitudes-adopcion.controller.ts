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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EtiquetasApi } from '../common/constants/documentacion-api';
import {
  ApiConflicto,
  ApiNoEncontrado,
  ApiProtegido,
} from '../common/decorators/api-protegido.decorator';
import { CreateSolicitudAdopcionDto } from './dto/create-solicitud-adopcion.dto';
import { RechazarSolicitudAdopcionDto } from './dto/rechazar-solicitud-adopcion.dto';
import { SolicitudAdopcionResponseDto } from './dto/solicitud-adopcion-response.dto';
import { SolicitudesAdopcionService } from './solicitudes-adopcion.service';

@ApiTags(EtiquetasApi.ADOPCIONES)
@ApiProtegido()
@Controller('solicitudes-adopcion')
export class SolicitudesAdopcionController {
  constructor(
    private readonly solicitudesAdopcionService: SolicitudesAdopcionService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Solicitar una mascota en adopción',
    description:
      'Requiere tener teléfono con código de país en el perfil, para que el dueño pueda contactarte si acepta.',
  })
  @ApiResponse({
    status: 201,
    description: 'Solicitud enviada.',
    type: SolicitudAdopcionResponseDto,
  })
  @ApiConflicto(
    'Falta el teléfono con código de país, ya solicitaste esta publicación, o la publicación no está disponible.',
  )
  @ApiNoEncontrado('La publicación no existe.')
  solicitar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSolicitudAdopcionDto,
  ): Promise<SolicitudAdopcionResponseDto> {
    return this.solicitudesAdopcionService.solicitar(user.sub, dto);
  }

  @Get('recibidas')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Listar las solicitudes que recibí',
    description: 'Las que otras personas hicieron sobre mis publicaciones.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitudes recibidas.',
    type: [SolicitudAdopcionResponseDto],
  })
  findRecibidas(
    @CurrentUser() user: JwtPayload,
  ): Promise<SolicitudAdopcionResponseDto[]> {
    return this.solicitudesAdopcionService.findRecibidas(user.sub);
  }

  @Get('mis-solicitudes')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Listar las solicitudes que hice',
    description: 'Con su estado: pendiente, aceptada o rechazada.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitudes enviadas por la sesión actual.',
    type: [SolicitudAdopcionResponseDto],
  })
  findMisSolicitudes(
    @CurrentUser() user: JwtPayload,
  ): Promise<SolicitudAdopcionResponseDto[]> {
    return this.solicitudesAdopcionService.findMisSolicitudes(user.sub);
  }

  @Get('matches')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Listar mis matches',
    description:
      'Solicitudes aceptadas, en las que ambas partes ya pueden verse el teléfono para coordinar la entrega.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitudes aceptadas con los datos de contacto.',
    type: [SolicitudAdopcionResponseDto],
  })
  findMatches(
    @CurrentUser() user: JwtPayload,
  ): Promise<SolicitudAdopcionResponseDto[]> {
    return this.solicitudesAdopcionService.findMatches(user.sub);
  }

  @Patch(':id/aceptar')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aceptar una solicitud recibida',
    description:
      'Genera el match: a partir de acá las dos partes ven el teléfono de la otra.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud aceptada.',
    type: SolicitudAdopcionResponseDto,
  })
  @ApiConflicto('La solicitud ya fue respondida.')
  @ApiNoEncontrado('La solicitud no existe o no es sobre una publicación propia.')
  aceptar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SolicitudAdopcionResponseDto> {
    return this.solicitudesAdopcionService.aceptar(user.sub, id);
  }

  @Patch(':id/rechazar')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rechazar una solicitud recibida',
    description: 'Se puede acompañar con un motivo para quien la envió.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud rechazada.',
    type: SolicitudAdopcionResponseDto,
  })
  @ApiConflicto('La solicitud ya fue respondida.')
  @ApiNoEncontrado('La solicitud no existe o no es sobre una publicación propia.')
  rechazar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarSolicitudAdopcionDto,
  ): Promise<SolicitudAdopcionResponseDto> {
    return this.solicitudesAdopcionService.rechazar(user.sub, id, dto);
  }
}
