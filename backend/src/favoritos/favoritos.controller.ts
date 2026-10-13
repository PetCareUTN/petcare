import {
  Body,
  Controller,
  Delete,
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
  ApiNoEncontrado,
  ApiProtegido,
} from '../common/decorators/api-protegido.decorator';
import { CreateFavoritoDto } from './dto/create-favorito.dto';
import { FavoritoResponseDto } from './dto/favorito-response.dto';
import { FavoritosService } from './favoritos.service';

@ApiTags(EtiquetasApi.ADOPCIONES)
@ApiProtegido()
@Controller('favoritos')
export class FavoritosController {
  constructor(private readonly favoritosService: FavoritosService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Guardar una publicación en favoritos',
    description: 'Es el corazón del listado de adopciones.',
  })
  @ApiResponse({
    status: 201,
    description: 'Publicación guardada.',
    type: FavoritoResponseDto,
  })
  @ApiNoEncontrado('La publicación no existe.')
  agregar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFavoritoDto,
  ): Promise<FavoritoResponseDto> {
    return this.favoritosService.agregar(user.sub, dto);
  }

  @Delete(':idPublicacion')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quitar una publicación de favoritos' })
  @ApiResponse({ status: 200, description: 'Publicación quitada.' })
  @ApiNoEncontrado('La publicación no estaba en favoritos.')
  quitar(
    @CurrentUser() user: JwtPayload,
    @Param('idPublicacion', ParseIntPipe) idPublicacion: number,
  ): Promise<{ mensaje: string }> {
    return this.favoritosService
      .quitar(user.sub, idPublicacion)
      .then(() => ({ mensaje: 'Quitado de favoritos' }));
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar mis favoritos' })
  @ApiResponse({
    status: 200,
    description: 'Publicaciones guardadas por la sesión actual.',
    type: [FavoritoResponseDto],
  })
  listar(@CurrentUser() user: JwtPayload): Promise<FavoritoResponseDto[]> {
    return this.favoritosService.listar(user.sub);
  }
}
