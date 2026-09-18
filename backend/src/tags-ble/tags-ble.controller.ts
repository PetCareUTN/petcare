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
import { TagBleResponseDto } from './dto/tag-ble-response.dto';
import { VincularTagBleDto } from './dto/vincular-tag-ble.dto';
import { TagsBleService } from './tags-ble.service';

@Controller('mascotas/:idMascota/tag-ble')
@UseGuards(JwtAuthGuard)
export class TagsBleController {
  constructor(private readonly tagsBleService: TagsBleService) {}

  @Get()
  async obtener(
    @CurrentUser() user: JwtPayload,
    @Param('idMascota', ParseIntPipe) idMascota: number,
  ): Promise<{ tagBle: TagBleResponseDto | null }> {
    const tagBle = await this.tagsBleService.obtenerPorMascota(user.sub, idMascota);
    return { tagBle };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  vincular(
    @CurrentUser() user: JwtPayload,
    @Param('idMascota', ParseIntPipe) idMascota: number,
    @Body() dto: VincularTagBleDto,
  ): Promise<TagBleResponseDto> {
    return this.tagsBleService.vincular(user.sub, idMascota, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async desvincular(
    @CurrentUser() user: JwtPayload,
    @Param('idMascota', ParseIntPipe) idMascota: number,
  ): Promise<{ mensaje: string }> {
    await this.tagsBleService.desvincular(user.sub, idMascota);
    return { mensaje: 'Tag desvinculado' };
  }
}
