import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { RoleName } from '../common/enums/role-name.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RechazarSolicitudDto } from './dto/aprobar-rechazar.dto';
import { VeterinariosService } from './veterinarios.service';

const MATRICULAS_DIR = join(process.cwd(), 'uploads', 'matriculas');

@Controller('veterinarios')
export class VeterinariosController {
  constructor(private readonly veterinariosService: VeterinariosService) {}

  @Post('solicitar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @UseInterceptors(
    FileInterceptor('matricula', {
      storage: diskStorage({
        destination: MATRICULAS_DIR,
        filename: (_req, file, cb) => {
          const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
        const ext = extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
          cb(
            new Error('Solo se permiten archivos JPG, PNG o PDF'),
            false,
          );
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false }))
  @HttpCode(HttpStatus.CREATED)
  crearSolicitud(
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, string>,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.veterinariosService.crearSolicitud(user.sub, body, file);
  }

  @Get('mi-estado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  obtenerEstado(@CurrentUser() user: JwtPayload) {
    return this.veterinariosService.obtenerEstado(user.sub);
  }

  @Get('pendientes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMINISTRADOR)
  listarPendientes() {
    return this.veterinariosService.listarPendientes();
  }

  @Get(':id/detalle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMINISTRADOR)
  obtenerDetalle(@Param('id', ParseIntPipe) id: number) {
    return this.veterinariosService.obtenerDetalle(id);
  }

  @Patch(':id/aprobar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  aprobar(@Param('id', ParseIntPipe) id: number) {
    return this.veterinariosService.aprobar(id);
  }

  @Patch(':id/rechazar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  rechazar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarSolicitudDto,
  ) {
    return this.veterinariosService.rechazar(id, dto.motivoRechazo);
  }
}
