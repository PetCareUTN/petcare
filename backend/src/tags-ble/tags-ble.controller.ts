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
  ApiConflicto,
  ApiNoEncontrado,
  ApiProtegido,
} from '../common/decorators/api-protegido.decorator';
import { TagBleResponseDto } from './dto/tag-ble-response.dto';
import { VincularTagBleDto } from './dto/vincular-tag-ble.dto';
import { TagsBleService } from './tags-ble.service';

@ApiTags(EtiquetasApi.LOCALIZACION_BLE)
@ApiProtegido()
@Controller('mascotas/:idMascota/tag-ble')
@UseGuards(JwtAuthGuard)
export class TagsBleController {
  constructor(private readonly tagsBleService: TagsBleService) {}

  @Get()
  @ApiOperation({
    summary: 'Ver el tag vinculado a una mascota',
    description: 'Devuelve null en tagBle si la mascota no tiene ninguno.',
  })
  @ApiResponse({ status: 200, description: 'Tag vinculado, o null.' })
  @ApiNoEncontrado('La mascota no existe o no es de esta sesión.')
  async obtener(
    @CurrentUser() user: JwtPayload,
    @Param('idMascota', ParseIntPipe) idMascota: number,
  ): Promise<{ tagBle: TagBleResponseDto | null }> {
    const tagBle = await this.tagsBleService.obtenerPorMascota(user.sub, idMascota);
    return { tagBle };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Vincular un tag Bluetooth a una mascota',
    description: 'Con el tag vinculado, otros celulares pueden detectarla si se pierde.',
  })
  @ApiResponse({ status: 201, description: 'Tag vinculado.', type: TagBleResponseDto })
  @ApiConflicto('Ese tag ya está vinculado a otra mascota.')
  @ApiNoEncontrado('La mascota no existe o no es de esta sesión.')
  vincular(
    @CurrentUser() user: JwtPayload,
    @Param('idMascota', ParseIntPipe) idMascota: number,
    @Body() dto: VincularTagBleDto,
  ): Promise<TagBleResponseDto> {
    return this.tagsBleService.vincular(user.sub, idMascota, dto);
  }

  @Post('silenciar-avisos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Silenciar los avisos de "fuera de casa" por 3 horas',
    description:
      'Es el "Está conmigo" del aviso preventivo: por ejemplo, cuando el dueño saca a pasear a la mascota. No afecta a los avisos de una mascota reportada como perdida.',
  })
  @ApiResponse({ status: 200, description: 'Hasta cuándo quedan silenciados.' })
  @ApiNoEncontrado('La mascota no tiene tag, o no es de esta sesión.')
  silenciarAvisos(
    @CurrentUser() user: JwtPayload,
    @Param('idMascota', ParseIntPipe) idMascota: number,
  ): Promise<{ avisosSilenciadosHasta: Date }> {
    return this.tagsBleService.silenciarAvisos(user.sub, idMascota);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desvincular el tag de una mascota' })
  @ApiResponse({ status: 200, description: 'Tag desvinculado.' })
  @ApiNoEncontrado('La mascota no tiene tag, o no es de esta sesión.')
  async desvincular(
    @CurrentUser() user: JwtPayload,
    @Param('idMascota', ParseIntPipe) idMascota: number,
  ): Promise<{ mensaje: string }> {
    await this.tagsBleService.desvincular(user.sub, idMascota);
    return { mensaje: 'Tag desvinculado' };
  }
}
