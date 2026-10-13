import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EtiquetasApi } from '../common/constants/documentacion-api';
import {
  ApiDatosInvalidos,
  ApiNoEncontrado,
  ApiProtegido,
} from '../common/decorators/api-protegido.decorator';
import { RoleName } from '../common/enums/role-name.enum';
import { DisponibilidadesVeterinariasService } from './disponibilidades-veterinarias.service';
import { DisponibilidadVeterinariaResponseDto } from './dto/disponibilidad-veterinaria-response.dto';
import { UpdateDisponibilidadVeterinariaDto } from './dto/update-disponibilidad-veterinaria.dto';

@ApiTags(EtiquetasApi.TURNOS)
@ApiProtegido()
@Controller('disponibilidades-veterinarias')
export class DisponibilidadesVeterinariasController {
  constructor(
    private readonly disponibilidadesService: DisponibilidadesVeterinariasService,
  ) {}

  @Get('mia')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @ApiProtegido(RoleName.VETERINARIO)
  @ApiOperation({
    summary: 'Ver la disponibilidad de mi veterinaria',
    description: 'Los días y franjas horarias en que se pueden pedir turnos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Franjas cargadas.',
    type: [DisponibilidadVeterinariaResponseDto],
  })
  findMine(
    @CurrentUser() user: JwtPayload,
  ): Promise<DisponibilidadVeterinariaResponseDto[]> {
    return this.disponibilidadesService.findMine(user.sub);
  }

  @Put('mia')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @HttpCode(HttpStatus.OK)
  @ApiProtegido(RoleName.VETERINARIO)
  @ApiOperation({
    summary: 'Reemplazar la disponibilidad de mi veterinaria',
    description:
      'Pisa la configuración entera con la que se manda: lo que no viene en el cuerpo se borra.',
  })
  @ApiResponse({
    status: 200,
    description: 'Disponibilidad guardada.',
    type: [DisponibilidadVeterinariaResponseDto],
  })
  @ApiDatosInvalidos('Alguna franja tiene la hora de inicio después de la de fin.')
  replaceMine(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateDisponibilidadVeterinariaDto,
  ): Promise<DisponibilidadVeterinariaResponseDto[]> {
    return this.disponibilidadesService.replaceMine(user.sub, dto);
  }

  @Get('veterinarios/:idVeterinario')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Ver la disponibilidad de una veterinaria',
    description: 'Lo usa el dueño antes de elegir el día del turno.',
  })
  @ApiResponse({
    status: 200,
    description: 'Franjas de esa veterinaria.',
    type: [DisponibilidadVeterinariaResponseDto],
  })
  @ApiNoEncontrado('La veterinaria no existe.')
  findByVeterinario(
    @Param('idVeterinario', ParseIntPipe) idVeterinario: number,
  ): Promise<DisponibilidadVeterinariaResponseDto[]> {
    return this.disponibilidadesService.findByVeterinario(idVeterinario);
  }
}
