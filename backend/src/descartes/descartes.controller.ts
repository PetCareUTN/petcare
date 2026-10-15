import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
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
import { DescartesService } from './descartes.service';
import { CreateDescarteDto } from './dto/create-descarte.dto';

@ApiTags(EtiquetasApi.ADOPCIONES)
@ApiProtegido()
@Controller('descartes')
export class DescartesController {
  constructor(private readonly descartesService: DescartesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Descartar una publicación del listado',
    description:
      'Es el "pasar" del listado de adopciones. Se guarda en el servidor para que la publicación no vuelva a aparecer al reabrir la app.',
  })
  @ApiResponse({ status: 201, description: 'Publicación descartada.' })
  @ApiNoEncontrado('La publicación no existe.')
  descartar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDescarteDto,
  ): Promise<{ mensaje: string }> {
    return this.descartesService
      .descartar(user.sub, dto)
      .then(() => ({ mensaje: 'Publicación descartada' }));
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Volver a empezar: borrar mis descartes',
    description: 'Las publicaciones descartadas vuelven a aparecer en el listado.',
  })
  @ApiResponse({ status: 200, description: 'Descartes eliminados.' })
  limpiar(@CurrentUser() user: JwtPayload): Promise<{ mensaje: string }> {
    return this.descartesService
      .limpiar(user.sub)
      .then(() => ({ mensaje: 'Descartes eliminados' }));
  }
}
