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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleName } from '../common/enums/role-name.enum';
import { ArchivoMedicoResponseDto } from './dto/archivo-medico-response.dto';
import { CreateEventoClinicoDto } from './dto/create-evento-clinico.dto';
import { EventoClinicoResponseDto } from './dto/evento-clinico-response.dto';
import { HistoriaClinicaResponseDto } from './dto/historia-clinica-response.dto';
import { EventosClinicosService } from './eventos-clinicos.service';
import type { UploadedMedicalFile } from './types/uploaded-medical-file.type';

const ARCHIVOS_MEDICOS_DIR = join(process.cwd(), 'uploads', 'eventos-clinicos');
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

@Controller('eventos-clinicos')
export class EventosClinicosController {
  constructor(
    private readonly eventosClinicosService: EventosClinicosService,
  ) {}

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
    @Query('ownerDocument') ownerDocument?: string,
    @Query('ownerEmail') ownerEmail?: string,
  ): Promise<HistoriaClinicaResponseDto> {
    return this.eventosClinicosService.findHistoriaClinicaByMascota(
      idMascota,
      user,
      { ownerDocument, ownerEmail },
    );
  }

  @Post(':idEvento/archivos-medicos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @UseInterceptors(archivosMedicosInterceptor)
  @HttpCode(HttpStatus.CREATED)
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
