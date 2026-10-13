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
  Query,
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
import { AdopcionesService } from './adopciones.service';
import { CreatePublicacionAdopcionDto } from './dto/create-publicacion-adopcion.dto';
import { FiltrosAdopcionDto } from './dto/filtros-adopcion.dto';
import { PublicacionAdopcionResponseDto } from './dto/publicacion-adopcion-response.dto';

@ApiTags(EtiquetasApi.ADOPCIONES)
@ApiProtegido()
@Controller('adopciones')
export class AdopcionesController {
  constructor(private readonly adopcionesService: AdopcionesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Publicar una mascota en adopción',
    description:
      'Dos requisitos que se validan acá: la mascota tiene que tener foto, y el perfil tiene que tener teléfono con código de país para que la otra persona pueda contactarte.',
  })
  @ApiResponse({
    status: 201,
    description: 'Publicación creada.',
    type: PublicacionAdopcionResponseDto,
  })
  @ApiConflicto(
    'La mascota no tiene foto, el perfil no tiene teléfono con código de país, o la mascota ya está publicada.',
  )
  @ApiNoEncontrado('La mascota no existe o no es de esta sesión.')
  publicar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePublicacionAdopcionDto,
  ): Promise<PublicacionAdopcionResponseDto> {
    return this.adopcionesService.publicar(user.sub, dto);
  }

  @Get('mias')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar mis publicaciones en adopción' })
  @ApiResponse({
    status: 200,
    description: 'Publicaciones de la sesión actual, con su cantidad de solicitudes.',
    type: [PublicacionAdopcionResponseDto],
  })
  findMisPublicaciones(
    @CurrentUser() user: JwtPayload,
  ): Promise<PublicacionAdopcionResponseDto[]> {
    return this.adopcionesService.findMisPublicaciones(user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Listar publicaciones para adoptar',
    description:
      'Es el listado que se desliza en la app. No incluye las publicaciones propias, ni las que ya solicitaste, ni las que descartaste.',
  })
  @ApiResponse({
    status: 200,
    description: 'Publicaciones disponibles según los filtros.',
    type: [PublicacionAdopcionResponseDto],
  })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() filtros: FiltrosAdopcionDto,
  ): Promise<PublicacionAdopcionResponseDto[]> {
    return this.adopcionesService.findAll(user.sub, filtros);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Ver el detalle de una publicación' })
  @ApiResponse({
    status: 200,
    description: 'Datos de la publicación.',
    type: PublicacionAdopcionResponseDto,
  })
  @ApiNoEncontrado('La publicación no existe.')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PublicacionAdopcionResponseDto> {
    return this.adopcionesService.findOne(id);
  }

  @Patch(':id/cancelar')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancelar una publicación propia',
    description: 'Deja de aparecer en el listado y no admite más solicitudes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Publicación cancelada.',
    type: PublicacionAdopcionResponseDto,
  })
  @ApiNoEncontrado('La publicación no existe o no es de esta sesión.')
  cancelar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PublicacionAdopcionResponseDto> {
    return this.adopcionesService.cancelar(user.sub, id);
  }

  @Patch(':id/pausar')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pausar una publicación propia',
    description: 'Se oculta del listado sin perder las solicitudes recibidas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Publicación pausada.',
    type: PublicacionAdopcionResponseDto,
  })
  @ApiNoEncontrado('La publicación no existe o no es de esta sesión.')
  pausar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PublicacionAdopcionResponseDto> {
    return this.adopcionesService.pausar(user.sub, id);
  }

  @Patch(':id/reanudar')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reanudar una publicación pausada' })
  @ApiResponse({
    status: 200,
    description: 'Publicación otra vez visible.',
    type: PublicacionAdopcionResponseDto,
  })
  @ApiNoEncontrado('La publicación no existe o no es de esta sesión.')
  reanudar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PublicacionAdopcionResponseDto> {
    return this.adopcionesService.reanudar(user.sub, id);
  }
}
