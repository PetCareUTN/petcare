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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EtiquetasApi } from '../common/constants/documentacion-api';
import {
  ApiConflicto,
  ApiNoEncontrado,
  ApiProtegido,
} from '../common/decorators/api-protegido.decorator';
import { RoleName } from '../common/enums/role-name.enum';
import { CreateSobreturnoVeterinarioDto } from './dto/create-sobreturno-veterinario.dto';
import { SobreturnoVeterinarioResponseDto } from './dto/sobreturno-veterinario-response.dto';
import { SobreturnosVeterinariosService } from './sobreturnos-veterinarios.service';

@ApiTags(EtiquetasApi.TURNOS)
@ApiProtegido(RoleName.VETERINARIO)
@Controller('sobreturnos-veterinarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.VETERINARIO)
export class SobreturnosVeterinariosController {
  constructor(
    private readonly sobreturnosService: SobreturnosVeterinariosService,
  ) {}

  @Post('mios')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Abrir un sobreturno',
    description:
      'Habilita un horario extra fuera de la disponibilidad habitual, para atender un caso puntual.',
  })
  @ApiResponse({
    status: 201,
    description: 'Sobreturno creado.',
    type: SobreturnoVeterinarioResponseDto,
  })
  @ApiConflicto('Ya hay un sobreturno o un turno en ese horario.')
  crear(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSobreturnoVeterinarioDto,
  ): Promise<SobreturnoVeterinarioResponseDto> {
    return this.sobreturnosService.crear(user.sub, dto);
  }

  @Get('mios')
  @ApiOperation({
    summary: 'Listar mis sobreturnos',
    description: 'Sin fecha devuelve todos los sobreturnos abiertos.',
  })
  @ApiQuery({
    name: 'fecha',
    required: false,
    example: '2026-10-20',
    description: 'Fecha en formato AAAA-MM-DD.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sobreturnos de la veterinaria.',
    type: [SobreturnoVeterinarioResponseDto],
  })
  listarMios(
    @CurrentUser() user: JwtPayload,
    @Query('fecha') fecha?: string,
  ): Promise<SobreturnoVeterinarioResponseDto[]> {
    return this.sobreturnosService.listarMios(user.sub, fecha);
  }

  @Delete(':idSobreturno')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un sobreturno' })
  @ApiResponse({ status: 200, description: 'Sobreturno eliminado.' })
  @ApiNoEncontrado('El sobreturno no existe o no es de esta veterinaria.')
  async eliminar(
    @CurrentUser() user: JwtPayload,
    @Param('idSobreturno', ParseIntPipe) idSobreturno: number,
  ): Promise<{ mensaje: string }> {
    await this.sobreturnosService.eliminar(user.sub, idSobreturno);
    return { mensaje: 'Sobreturno eliminado' };
  }
}
