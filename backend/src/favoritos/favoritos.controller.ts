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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateFavoritoDto } from './dto/create-favorito.dto';
import { FavoritoResponseDto } from './dto/favorito-response.dto';
import { FavoritosService } from './favoritos.service';

@Controller('favoritos')
export class FavoritosController {
  constructor(private readonly favoritosService: FavoritosService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  agregar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFavoritoDto,
  ): Promise<FavoritoResponseDto> {
    return this.favoritosService.agregar(user.sub, dto);
  }

  @Delete(':idPublicacion')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
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
  listar(@CurrentUser() user: JwtPayload): Promise<FavoritoResponseDto[]> {
    return this.favoritosService.listar(user.sub);
  }
}
