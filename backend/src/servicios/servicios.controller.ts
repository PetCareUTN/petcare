import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CategoriaServicio } from '../common/enums/categoria-servicio.enum';
import { RoleName } from '../common/enums/role-name.enum';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { ServicioResponseDto } from './dto/servicio-response.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';
import { ServiciosService } from './servicios.service';

@Controller('servicios')
export class ServiciosController {
  constructor(private readonly serviciosService: ServiciosService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.DUENO_MASCOTA, RoleName.VETERINARIO)
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateServicioDto,
  ): Promise<ServicioResponseDto> {
    return this.serviciosService.create(user.sub, dto);
  }

  @Get('mios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.DUENO_MASCOTA, RoleName.VETERINARIO)
  findMine(@CurrentUser() user: JwtPayload): Promise<ServicioResponseDto[]> {
    return this.serviciosService.findMine(user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('categoria') categoria?: CategoriaServicio,
  ): Promise<ServicioResponseDto[]> {
    return this.serviciosService.findAll(categoria);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ServicioResponseDto> {
    return this.serviciosService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.DUENO_MASCOTA, RoleName.VETERINARIO)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServicioDto,
  ): Promise<ServicioResponseDto> {
    return this.serviciosService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.DUENO_MASCOTA, RoleName.VETERINARIO)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.serviciosService.remove(id, user.sub);
  }
}
