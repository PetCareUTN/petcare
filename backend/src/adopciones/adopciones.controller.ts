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
import { AdopcionesService } from './adopciones.service';
import { CreatePublicacionAdopcionDto } from './dto/create-publicacion-adopcion.dto';
import { PublicacionAdopcionResponseDto } from './dto/publicacion-adopcion-response.dto';

@Controller('adopciones')
export class AdopcionesController {
  constructor(private readonly adopcionesService: AdopcionesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  publicar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePublicacionAdopcionDto,
  ): Promise<PublicacionAdopcionResponseDto> {
    return this.adopcionesService.publicar(user.sub, dto);
  }

  @Get('mias')
  @UseGuards(JwtAuthGuard)
  findMisPublicaciones(
    @CurrentUser() user: JwtPayload,
  ): Promise<PublicacionAdopcionResponseDto[]> {
    return this.adopcionesService.findMisPublicaciones(user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @CurrentUser() user: JwtPayload,
  ): Promise<PublicacionAdopcionResponseDto[]> {
    return this.adopcionesService.findAll(user.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PublicacionAdopcionResponseDto> {
    return this.adopcionesService.findOne(id);
  }
}
