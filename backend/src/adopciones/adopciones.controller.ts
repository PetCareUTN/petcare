import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
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
}
