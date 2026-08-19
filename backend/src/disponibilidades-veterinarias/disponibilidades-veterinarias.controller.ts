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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VeterinarioValidadoGuard } from '../auth/guards/veterinario-validado.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleName } from '../common/enums/role-name.enum';
import { DisponibilidadesVeterinariasService } from './disponibilidades-veterinarias.service';
import { DisponibilidadVeterinariaResponseDto } from './dto/disponibilidad-veterinaria-response.dto';
import { UpdateDisponibilidadVeterinariaDto } from './dto/update-disponibilidad-veterinaria.dto';

@Controller('disponibilidades-veterinarias')
export class DisponibilidadesVeterinariasController {
  constructor(
    private readonly disponibilidadesService: DisponibilidadesVeterinariasService,
  ) {}

  @Get('mia')
  @UseGuards(JwtAuthGuard, RolesGuard, VeterinarioValidadoGuard)
  @Roles(RoleName.VETERINARIO)
  findMine(
    @CurrentUser() user: JwtPayload,
  ): Promise<DisponibilidadVeterinariaResponseDto[]> {
    return this.disponibilidadesService.findMine(user.sub);
  }

  @Put('mia')
  @UseGuards(JwtAuthGuard, RolesGuard, VeterinarioValidadoGuard)
  @Roles(RoleName.VETERINARIO)
  @HttpCode(HttpStatus.OK)
  replaceMine(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateDisponibilidadVeterinariaDto,
  ): Promise<DisponibilidadVeterinariaResponseDto[]> {
    return this.disponibilidadesService.replaceMine(user.sub, dto);
  }

  @Get('veterinarios/:idVeterinario')
  @UseGuards(JwtAuthGuard)
  findByVeterinario(
    @Param('idVeterinario', ParseIntPipe) idVeterinario: number,
  ): Promise<DisponibilidadVeterinariaResponseDto[]> {
    return this.disponibilidadesService.findByVeterinario(idVeterinario);
  }
}
