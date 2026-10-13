import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
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
import { CategoriaServicio } from '../common/enums/categoria-servicio.enum';
import { PrestadoresService } from './prestadores.service';
import { CuentaPrestadorGuard } from './cuenta-prestador.guard';
import {
  CrearReporteDto,
  CrearResenaDto,
  ResolverReporteDto,
  RevisarPrestadorDto,
  SolicitarPrestadorDto,
} from './prestadores.dto';

@ApiTags(EtiquetasApi.SERVICIOS)
@ApiProtegido()
@Controller('prestadores')
@UseGuards(JwtAuthGuard, CuentaPrestadorGuard, RolesGuard)
export class PrestadoresController {
  constructor(private readonly service: PrestadoresService) {}

  @Get('solicitudes/mias')
  @Roles(RoleName.DUENO_MASCOTA)
  @ApiProtegido(RoleName.DUENO_MASCOTA)
  @ApiOperation({
    summary: 'Ver mis solicitudes para ser prestador',
    description: 'Con su estado: pendiente, aprobado o rechazado.',
  })
  @ApiResponse({ status: 200, description: 'Solicitudes de la sesión actual.' })
  mias(@CurrentUser() user: JwtPayload) {
    return this.service.mias(user.sub);
  }

  @Post('solicitudes')
  @Roles(RoleName.DUENO_MASCOTA)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'identidad', maxCount: 1 },
        { name: 'evidencia', maxCount: 4 },
      ],
      {
        storage: memoryStorage(),
        limits: {
          fileSize: 5 * 1024 * 1024,
          files: 5,
          fields: 12,
          fieldSize: 10000,
        },
      },
    ),
  )
  @ApiProtegido(RoleName.DUENO_MASCOTA)
  @ApiOperation({
    summary: 'Solicitar ser prestador de una categoría',
    description:
      'Se adjunta el documento de identidad y hasta 4 evidencias, de 5 MB cada archivo. La dirección se geocodifica para ubicar al prestador en el mapa. La aprueba un administrador.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Solicitud enviada. Puede avisar que la dirección se ubicó con poca precisión.',
  })
  @ApiConflicto('Ya hay una solicitud en curso para esa categoría.')
  solicitar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SolicitarPrestadorDto,
    @UploadedFiles()
    files: {
      identidad?: Express.Multer.File[];
      evidencia?: Express.Multer.File[];
    },
  ) {
    return this.service.solicitar(user.sub, dto, [
      ...(files?.identidad ?? []),
      ...(files?.evidencia ?? []),
    ]);
  }

  @Get('documentos/:id')
  @ApiOperation({
    summary: 'Descargar un documento de una solicitud',
    description:
      'Devuelve el archivo, no un JSON. Lo puede bajar quien subió la solicitud o un administrador. Los documentos vencen.',
  })
  @ApiProduces('image/jpeg', 'image/png', 'application/pdf')
  @ApiResponse({ status: 200, description: 'Contenido del documento.' })
  @ApiNoEncontrado('El documento no existe o ya venció.')
  async documento(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const doc = await this.service.documento(
      id,
      user.sub,
      user.rol === RoleName.ADMINISTRADOR,
    );
    res.set({
      'Content-Type': doc.mime,
      'Content-Disposition': `attachment; filename="documento-${doc.id}.${doc.mime === 'application/pdf' ? 'pdf' : doc.mime === 'image/png' ? 'png' : 'jpg'}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(doc.contenido);
  }

  @Get('admin/solicitudes')
  @Roles(RoleName.ADMINISTRADOR)
  @ApiProtegido(RoleName.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Listar las solicitudes de prestador a revisar',
    description: 'Panel de administración.',
  })
  @ApiResponse({ status: 200, description: 'Solicitudes con sus documentos.' })
  listar() {
    return this.service.listar();
  }
  @Post('admin/solicitudes/:id/revision')
  @Roles(RoleName.ADMINISTRADOR)
  @ApiProtegido(RoleName.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Aprobar o rechazar una solicitud de prestador',
    description:
      'Recién con la solicitud aprobada la persona puede publicar servicios de esa categoría.',
  })
  @ApiResponse({ status: 201, description: 'Solicitud revisada.' })
  @ApiNoEncontrado('La solicitud no existe.')
  revisar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RevisarPrestadorDto,
  ) {
    return this.service.revisar(id, user.sub, dto);
  }
  @Get('admin/reportes')
  @Roles(RoleName.ADMINISTRADOR)
  @ApiProtegido(RoleName.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar los reportes sobre prestadores' })
  @ApiResponse({ status: 200, description: 'Reportes sin resolver y resueltos.' })
  reportes() {
    return this.service.reportes();
  }
  @Post('admin/reportes/:id/resolver')
  @Roles(RoleName.ADMINISTRADOR)
  @ApiProtegido(RoleName.ADMINISTRADOR)
  @ApiOperation({ summary: 'Resolver un reporte sobre un prestador' })
  @ApiResponse({ status: 201, description: 'Reporte resuelto.' })
  @ApiNoEncontrado('El reporte no existe.')
  resolver(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ResolverReporteDto,
  ) {
    return this.service.resolver(id, user.sub, dto);
  }

  @Get('reservas')
  @ApiOperation({
    summary: 'Listar las reservas de mis servicios',
    description: 'Los turnos que me reservaron, para marcarlos como realizados.',
  })
  @ApiResponse({ status: 200, description: 'Reservas recibidas.' })
  reservas(@CurrentUser() user: JwtPayload) {
    return this.service.reservas(user.sub);
  }
  @Post('turnos/:id/completar')
  @ApiOperation({
    summary: 'Marcar un turno como realizado',
    description: 'Recién después de esto se puede dejar una reseña o un reporte.',
  })
  @ApiResponse({ status: 201, description: 'Turno marcado como realizado.' })
  @ApiConflicto('El turno no está en un estado que permita completarlo.')
  @ApiNoEncontrado('El turno no existe o no es de esta sesión.')
  completar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.completar(user.sub, id);
  }
  @Post('turnos/:id/resena')
  @ApiOperation({
    summary: 'Dejar una reseña de un turno realizado',
    description: 'La escribe quien contrató el servicio. Suma al puntaje del prestador.',
  })
  @ApiResponse({ status: 201, description: 'Reseña guardada.' })
  @ApiConflicto('El turno no está realizado, o ya tiene una reseña.')
  @ApiNoEncontrado('El turno no existe o no es de esta sesión.')
  resenar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CrearResenaDto,
  ) {
    return this.service.resenar(user.sub, id, dto);
  }
  @Post('turnos/:id/reporte')
  @ApiOperation({
    summary: 'Reportar un problema con un turno',
    description: 'Lo revisa un administrador desde GET /prestadores/admin/reportes.',
  })
  @ApiResponse({ status: 201, description: 'Reporte enviado.' })
  @ApiNoEncontrado('El turno no existe o no es de esta sesión.')
  reportar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CrearReporteDto,
  ) {
    return this.service.reportar(user.sub, id, dto);
  }
  @Get(':id/:categoria/perfil')
  @ApiOperation({
    summary: 'Ver el perfil público de un prestador',
    description: 'Sus datos en esa categoría, con el puntaje y las reseñas recibidas.',
  })
  @ApiResponse({ status: 200, description: 'Perfil del prestador.' })
  @ApiNoEncontrado('El prestador no existe o no está aprobado en esa categoría.')
  perfil(
    @Param('id', ParseIntPipe) id: number,
    @Param('categoria', new ParseEnumPipe(CategoriaServicio))
    categoria: CategoriaServicio,
  ) {
    return this.service.perfil(id, categoria);
  }
}
