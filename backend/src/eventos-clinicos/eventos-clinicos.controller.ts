import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import type { Response } from 'express';
import { extname } from 'path';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LimiteIntentosGuard } from '../auth/guards/limite-intentos.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EtiquetasApi } from '../common/constants/documentacion-api';
import {
  ApiDatosInvalidos,
  ApiNoEncontrado,
  ApiProtegido,
} from '../common/decorators/api-protegido.decorator';
import { ErrorRespuestaDto } from '../common/dto/error-respuesta.dto';
import { RoleName } from '../common/enums/role-name.enum';
import { AsistenteEventoClinicoService } from './asistente-evento-clinico.service';
import { ArchivoMedicoResponseDto } from './dto/archivo-medico-response.dto';
import {
  AsistenteEventoClinicoDto,
  SugerenciaEventoClinicoDto,
} from './dto/asistente-evento-clinico.dto';
import { CreateEventoClinicoDto } from './dto/create-evento-clinico.dto';
import { EventoClinicoResponseDto } from './dto/evento-clinico-response.dto';
import { HistoriaClinicaResponseDto } from './dto/historia-clinica-response.dto';
import {
  ARCHIVOS_MEDICOS_DIR,
  EventosClinicosService,
} from './eventos-clinicos.service';
import type { UploadedMedicalFile } from './types/uploaded-medical-file.type';

// Igual que en veterinarios.controller.ts: multer no crea el destino, y
// uploads/ esta gitignoreado, asi que en un despliegue nuevo no existe y
// adjuntar un estudio a la historia clinica falla con ENOENT.
mkdirSync(ARCHIVOS_MEDICOS_DIR, { recursive: true });
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];
const MAX_ARCHIVO_SIZE_IN_BYTES = 10 * 1024 * 1024;
const MAX_ARCHIVOS_POR_SOLICITUD = 5;

const archivosMedicosInterceptor = FilesInterceptor(
  'archivos',
  MAX_ARCHIVOS_POR_SOLICITUD,
  {
    storage: diskStorage({
      destination: ARCHIVOS_MEDICOS_DIR,
      filename: (_req, file, cb) => {
        const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
        cb(null, uniqueName);
      },
    }),
    fileFilter: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        cb(
          new BadRequestException({
            codigoEstado: 400,
            mensaje: 'Solo se permiten archivos JPG, PNG o PDF',
          }),
          false,
        );
        return;
      }
      cb(null, true);
    },
    limits: { fileSize: MAX_ARCHIVO_SIZE_IN_BYTES },
  },
);

@ApiTags(EtiquetasApi.HISTORIA_CLINICA)
@ApiProtegido()
@Controller('eventos-clinicos')
export class EventosClinicosController {
  constructor(
    private readonly eventosClinicosService: EventosClinicosService,
    private readonly asistenteEventoClinicoService: AsistenteEventoClinicoService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @HttpCode(HttpStatus.CREATED)
  @ApiProtegido(RoleName.VETERINARIO)
  @ApiOperation({
    summary: 'Cargar una atención en la historia clínica',
    description:
      'Registra la consulta, vacuna o estudio sobre una mascota. Los archivos se adjuntan después con POST /eventos-clinicos/{idEvento}/archivos-medicos.',
  })
  @ApiResponse({
    status: 201,
    description: 'Atención registrada.',
    type: EventoClinicoResponseDto,
  })
  @ApiDatosInvalidos()
  @ApiNoEncontrado('La mascota no existe.')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEventoClinicoDto,
  ): Promise<EventoClinicoResponseDto> {
    return this.eventosClinicosService.create(user.sub, dto);
  }

  // Asistente de voz (P1-182): ordena en campos la consulta dictada, sin
  // guardar nada. Cada llamada gasta crédito de IA, de ahí el límite por IP.
  @Post('asistente')
  @UseGuards(JwtAuthGuard, RolesGuard, LimiteIntentosGuard)
  @Roles(RoleName.VETERINARIO)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiProtegido(RoleName.VETERINARIO)
  @ApiOperation({
    summary: 'Ordenar en campos una consulta dictada por voz',
    description:
      'Recibe la transcripción del dictado y devuelve una sugerencia de cómo completar el formulario. No guarda nada: la veterinaria revisa y confirma. Límite: 10 por minuto y por IP, porque cada llamada consume crédito de IA.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sugerencia de campos para el formulario.',
    type: SugerenciaEventoClinicoDto,
  })
  @ApiResponse({
    status: 503,
    description:
      'El asistente no está disponible (falta la API key, no hay crédito o falló la llamada). La carga manual sigue funcionando.',
    type: ErrorRespuestaDto,
  })
  sugerirCampos(
    @Body() dto: AsistenteEventoClinicoDto,
  ): Promise<SugerenciaEventoClinicoDto> {
    return this.asistenteEventoClinicoService.sugerirCampos(dto.transcripcion);
  }

  @Get('mascota/:idMascota')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ver la historia clínica de una mascota',
    description:
      'El dueño ve la de sus mascotas. La veterinaria accede identificando al dueño con ownerDocument u ownerEmail.',
  })
  @ApiQuery({ name: 'ownerDocument', required: false })
  @ApiQuery({ name: 'ownerEmail', required: false })
  @ApiResponse({
    status: 200,
    description: 'Historia clínica con sus eventos.',
    type: HistoriaClinicaResponseDto,
  })
  @ApiNoEncontrado('La mascota no existe o no es accesible para esta sesión.')
  findByMascota(
    @CurrentUser() user: JwtPayload,
    @Param('idMascota', ParseIntPipe) idMascota: number,
    @Query('ownerDocument') ownerDocument?: string,
    @Query('ownerEmail') ownerEmail?: string,
  ): Promise<HistoriaClinicaResponseDto> {
    return this.eventosClinicosService.findHistoriaClinicaByMascota(
      idMascota,
      user,
      { ownerDocument, ownerEmail },
    );
  }

  @Get('archivos-medicos/:idArchivo')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Descargar un archivo médico',
    description:
      'Devuelve el archivo (imagen o PDF), no un JSON. A diferencia de las fotos de mascotas, estos archivos no son públicos: se sirven por acá para poder verificar la sesión y los permisos.',
  })
  @ApiProduces('image/jpeg', 'image/png', 'application/pdf')
  @ApiQuery({ name: 'ownerDocument', required: false })
  @ApiQuery({ name: 'ownerEmail', required: false })
  @ApiResponse({ status: 200, description: 'Contenido del archivo.' })
  @ApiNoEncontrado('El archivo no existe o no es accesible para esta sesión.')
  async descargarArchivoMedico(
    @CurrentUser() user: JwtPayload,
    @Param('idArchivo', ParseIntPipe) idArchivo: number,
    @Res() res: Response,
    // Mismo contexto de atención que la historia clínica: el veterinario que
    // llegó a la mascota buscando al dueño por DNI o email.
    @Query('ownerDocument') ownerDocument?: string,
    @Query('ownerEmail') ownerEmail?: string,
  ): Promise<void> {
    const archivo = await this.eventosClinicosService.obtenerArchivoMedico(
      idArchivo,
      user,
      { ownerDocument, ownerEmail },
    );
    res.set({
      'Content-Type': archivo.mimeType,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(archivo.nombreOriginal)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.sendFile(archivo.ruta);
  }

  @Post(':idEvento/archivos-medicos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @UseInterceptors(archivosMedicosInterceptor)
  @HttpCode(HttpStatus.CREATED)
  @ApiProtegido(RoleName.VETERINARIO)
  @ApiOperation({
    summary: 'Adjuntar archivos a una atención',
    description:
      'Hasta 5 archivos por llamada, de 10 MB cada uno. Se aceptan JPG, PNG y PDF.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Archivos adjuntados.',
    type: [ArchivoMedicoResponseDto],
  })
  @ApiDatosInvalidos('Algún archivo supera el tamaño o no es de un tipo permitido.')
  @ApiNoEncontrado('La atención no existe o no la cargó esta veterinaria.')
  agregarArchivos(
    @CurrentUser() user: JwtPayload,
    @Param('idEvento', ParseIntPipe) idEvento: number,
    @UploadedFiles() archivos: UploadedMedicalFile[],
  ): Promise<ArchivoMedicoResponseDto[]> {
    return this.eventosClinicosService.agregarArchivos(
      idEvento,
      user.sub,
      archivos,
    );
  }
}
