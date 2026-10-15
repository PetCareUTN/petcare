import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
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
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { EtiquetasApi } from '../common/constants/documentacion-api';
import {
  ApiConflicto,
  ApiNoEncontrado,
  ApiProtegido,
} from '../common/decorators/api-protegido.decorator';
import { RoleName } from '../common/enums/role-name.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RechazarSolicitudDto } from './dto/aprobar-rechazar.dto';
import { RegisterVeterinarioDto } from './dto/register-veterinario.dto';
import { UpdateProvinciaDto } from './dto/update-provincia.dto';
import type { TipoDocumentoVeterinario } from './dto/veterinario-response.dto';
import type { UploadedDocumentFile } from './types/uploaded-document-file.type';
import { VeterinariosService } from './veterinarios.service';

const MATRICULAS_DIR = join(process.cwd(), 'uploads', 'matriculas');
const HABILITACIONES_DIR = join(process.cwd(), 'uploads', 'habilitaciones');

// multer no crea el directorio de destino: si falta, la subida muere con
// ENOENT y el registro del veterinario devuelve 500. En las maquinas del
// equipo estos directorios existen desde hace rato, pero uploads/ esta
// gitignoreado, asi que en un despliegue nuevo el volumen arranca vacio.
mkdirSync(MATRICULAS_DIR, { recursive: true });
mkdirSync(HABILITACIONES_DIR, { recursive: true });

const documentoFilter = (_req: any, file: any, cb: any) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
  const ext = extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    cb(new Error('Solo se permiten archivos JPG, PNG o PDF'), false);
    return;
  }
  cb(null, true);
};

const registrarDocumentosInterceptor = FileFieldsInterceptor(
  [
    { name: 'matricula', maxCount: 1 },
    { name: 'habilitacion', maxCount: 1 },
  ],
  {
    storage: diskStorage({
      destination: (_req, file, cb) => {
        const dir = file.fieldname === 'matricula' ? MATRICULAS_DIR : HABILITACIONES_DIR;
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
        cb(null, uniqueName);
      },
    }),
    fileFilter: documentoFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  },
);

@ApiTags(EtiquetasApi.VETERINARIOS)
@Controller('veterinarios')
export class VeterinariosController {
  constructor(private readonly veterinariosService: VeterinariosService) {}

  @Post('registro')
  @UseInterceptors(registrarDocumentosInterceptor)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar una veterinaria',
    description:
      'Endpoint público: crea la cuenta junto con la matrícula y la habilitación (5 MB cada archivo). Queda pendiente de validación hasta que un administrador la apruebe.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Veterinaria registrada, pendiente de validación.' })
  @ApiConflicto('Ya existe una cuenta con ese email, documento o matrícula.')
  registro(
    @Body() dto: RegisterVeterinarioDto,
    @UploadedFiles() files: { matricula?: Express.Multer.File[]; habilitacion?: Express.Multer.File[] },
  ) {
    const matricula = files.matricula?.[0];
    const habilitacion = files.habilitacion?.[0];
    return this.veterinariosService.registrarVeterinario(dto, matricula, habilitacion);
  }

  @Get('mi-estado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @ApiProtegido(RoleName.VETERINARIO)
  @ApiOperation({
    summary: 'Ver el estado de validación de mi veterinaria',
    description: 'Pendiente, aprobado o rechazado. La app lo consulta para saber qué habilitar.',
  })
  @ApiResponse({ status: 200, description: 'Estado de la veterinaria.' })
  obtenerEstado(@CurrentUser() user: JwtPayload) {
    return this.veterinariosService.obtenerEstado(user.sub);
  }

  @Patch('mi-provincia')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @ApiProtegido(RoleName.VETERINARIO)
  @ApiOperation({
    summary: 'Actualizar la provincia de mi matrícula',
    description: 'Completa el dato en las cuentas creadas antes de que el campo existiera.',
  })
  @ApiResponse({ status: 200, description: 'Provincia actualizada.' })
  actualizarProvincia(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProvinciaDto,
  ) {
    return this.veterinariosService.actualizarProvincia(user.sub, dto.provincia);
  }

  @Get('aprobados')
  @UseGuards(JwtAuthGuard)
  @ApiProtegido()
  @ApiOperation({
    summary: 'Listar las veterinarias aprobadas',
    description:
      'Es el listado que ve el dueño al pedir un turno. Trae la dirección y las coordenadas para el mapa.',
  })
  @ApiResponse({ status: 200, description: 'Veterinarias habilitadas.' })
  listarAprobados() {
    return this.veterinariosService.listarAprobados();
  }

  @Get('pendientes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMINISTRADOR)
  @ApiProtegido(RoleName.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar las veterinarias pendientes de validación' })
  @ApiResponse({ status: 200, description: 'Veterinarias a revisar.' })
  listarPendientes() {
    return this.veterinariosService.listarPendientes();
  }

  @Get(':id/documentos/:tipo')
  @UseGuards(JwtAuthGuard)
  @ApiProtegido()
  @ApiOperation({
    summary: 'Descargar la matrícula o la habilitación',
    description:
      'Devuelve el archivo, no un JSON. Lo baja el administrador para validar, o la propia veterinaria.',
  })
  @ApiProduces('image/jpeg', 'image/png', 'application/pdf')
  @ApiResponse({ status: 200, description: 'Contenido del documento.' })
  @ApiNoEncontrado('El documento no existe o no es accesible para esta sesión.')
  async descargarDocumento(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param(
      'tipo',
      new ParseEnumPipe({
        matricula: 'matricula',
        habilitacion: 'habilitacion',
      }),
    )
    tipo: TipoDocumentoVeterinario,
    @Res() res: Response,
  ): Promise<void> {
    const ruta = await this.veterinariosService.obtenerDocumento(
      id,
      tipo,
      user,
    );
    res.set({
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    // sendFile deduce el Content-Type por la extensión (solo se aceptan JPG, PNG y PDF).
    res.sendFile(ruta);
  }

  @Get(':id/detalle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMINISTRADOR)
  @ApiProtegido(RoleName.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Ver el detalle de una veterinaria',
    description: 'Los datos y documentos que el administrador revisa antes de aprobar.',
  })
  @ApiResponse({ status: 200, description: 'Detalle de la veterinaria.' })
  @ApiNoEncontrado('La veterinaria no existe.')
  obtenerDetalle(@Param('id', ParseIntPipe) id: number) {
    return this.veterinariosService.obtenerDetalle(id);
  }

  @Patch(':id/aprobar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  @ApiProtegido(RoleName.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Aprobar una veterinaria',
    description: 'A partir de acá puede publicar disponibilidad y recibir turnos.',
  })
  @ApiResponse({ status: 200, description: 'Veterinaria aprobada.' })
  @ApiNoEncontrado('La veterinaria no existe.')
  aprobar(@Param('id', ParseIntPipe) id: number) {
    return this.veterinariosService.aprobar(id);
  }

  @Patch(':id/rechazar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  @ApiProtegido(RoleName.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Rechazar una veterinaria',
    description: 'Se indica el motivo, que la veterinaria ve en su estado.',
  })
  @ApiResponse({ status: 200, description: 'Veterinaria rechazada.' })
  @ApiNoEncontrado('La veterinaria no existe.')
  rechazar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarSolicitudDto,
  ) {
    return this.veterinariosService.rechazar(id, dto.motivoRechazo);
  }
}
