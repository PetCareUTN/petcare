import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { DescartesService } from './descartes.service';
import { CreateDescarteDto } from './dto/create-descarte.dto';

@Controller('descartes')
export class DescartesController {
  constructor(private readonly descartesService: DescartesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
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
  limpiar(@CurrentUser() user: JwtPayload): Promise<{ mensaje: string }> {
    return this.descartesService
      .limpiar(user.sub)
      .then(() => ({ mensaje: 'Descartes eliminados' }));
  }
}
