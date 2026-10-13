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
  ApiDatosInvalidos,
  ApiNoEncontrado,
  ApiProtegido,
} from '../common/decorators/api-protegido.decorator';
import { CategoriaServicio } from '../common/enums/categoria-servicio.enum';
import { RoleName } from '../common/enums/role-name.enum';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { ServicioResponseDto } from './dto/servicio-response.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';
import { ServiciosService } from './servicios.service';

@ApiTags(EtiquetasApi.SERVICIOS)
@ApiProtegido()
@Controller('servicios')
export class ServiciosController {
  constructor(private readonly serviciosService: ServiciosService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.DUENO_MASCOTA, RoleName.VETERINARIO)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Publicar un servicio',
    description:
      'Requiere tener aprobada la solicitud de prestador para esa categoría (ver POST /prestadores/solicitudes). Los veterinarios validados no necesitan la solicitud.',
  })
  @ApiResponse({
    status: 201,
    description: 'Servicio publicado.',
    type: ServicioResponseDto,
  })
  @ApiDatosInvalidos('Alguna franja tiene la hora de inicio después de la de fin.')
  @ApiConflicto('No hay una solicitud de prestador aprobada para esa categoría.')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateServicioDto,
  ): Promise<ServicioResponseDto> {
    return this.serviciosService.create(user.sub, dto);
  }

  @Get('mios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.DUENO_MASCOTA, RoleName.VETERINARIO)
  @ApiOperation({ summary: 'Listar los servicios que publiqué' })
  @ApiResponse({
    status: 200,
    description: 'Servicios de la sesión actual.',
    type: [ServicioResponseDto],
  })
  findMine(@CurrentUser() user: JwtPayload): Promise<ServicioResponseDto[]> {
    return this.serviciosService.findMine(user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Listar los servicios disponibles',
    description:
      'Sólo aparecen los prestadores aprobados. Cada servicio trae la dirección y las coordenadas del prestador, que son las que dibujan los pines del mapa.',
  })
  @ApiQuery({ name: 'categoria', required: false, enum: CategoriaServicio })
  @ApiResponse({
    status: 200,
    description: 'Servicios publicados.',
    type: [ServicioResponseDto],
  })
  findAll(
    @Query('categoria') categoria?: CategoriaServicio,
  ): Promise<ServicioResponseDto[]> {
    return this.serviciosService.findAll(categoria);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Ver el detalle de un servicio' })
  @ApiResponse({
    status: 200,
    description: 'Datos del servicio con sus horarios.',
    type: ServicioResponseDto,
  })
  @ApiNoEncontrado('El servicio no existe.')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload): Promise<ServicioResponseDto> {
    return this.serviciosService.findOne(id, user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.DUENO_MASCOTA, RoleName.VETERINARIO)
  @ApiOperation({
    summary: 'Editar un servicio propio',
    description:
      'No se puede cambiar la categoría: para eso se crea un servicio nuevo, así las reservas viejas conservan la suya.',
  })
  @ApiResponse({
    status: 200,
    description: 'Servicio actualizado.',
    type: ServicioResponseDto,
  })
  @ApiDatosInvalidos('Se intentó cambiar la categoría, o una franja es inválida.')
  @ApiNoEncontrado('El servicio no existe o no es de esta sesión.')
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
  @ApiOperation({ summary: 'Dar de baja un servicio propio' })
  @ApiResponse({ status: 204, description: 'Servicio eliminado.' })
  @ApiNoEncontrado('El servicio no existe o no es de esta sesión.')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.serviciosService.remove(id, user.sub);
  }
}
