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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleName } from '../common/enums/role-name.enum';
import { CreateEventoClinicoDto } from './dto/create-evento-clinico.dto';
import { EventoClinicoResponseDto } from './dto/evento-clinico-response.dto';
import { HistoriaClinicaResponseDto } from './dto/historia-clinica-response.dto';
import { EventosClinicosService } from './eventos-clinicos.service';

@Controller('eventos-clinicos')
export class EventosClinicosController {
  constructor(private readonly eventosClinicosService: EventosClinicosService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEventoClinicoDto,
  ): Promise<EventoClinicoResponseDto> {
    return this.eventosClinicosService.create(user.sub, dto);
  }

  @Get('mascota/:idMascota')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  findByMascota(
    @CurrentUser() user: JwtPayload,
    @Param('idMascota', ParseIntPipe) idMascota: number,
  ): Promise<HistoriaClinicaResponseDto> {
    return this.eventosClinicosService.findHistoriaClinicaByMascota(idMascota, user);
  }
}
