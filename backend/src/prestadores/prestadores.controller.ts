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
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
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

@Controller('prestadores')
@UseGuards(JwtAuthGuard, CuentaPrestadorGuard, RolesGuard)
export class PrestadoresController {
  constructor(private readonly service: PrestadoresService) {}

  @Get('solicitudes/mias')
  @Roles(RoleName.DUENO_MASCOTA)
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
  listar() {
    return this.service.listar();
  }
  @Post('admin/solicitudes/:id/revision')
  @Roles(RoleName.ADMINISTRADOR)
  revisar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RevisarPrestadorDto,
  ) {
    return this.service.revisar(id, user.sub, dto);
  }
  @Get('admin/reportes')
  @Roles(RoleName.ADMINISTRADOR)
  reportes() {
    return this.service.reportes();
  }
  @Post('admin/reportes/:id/resolver')
  @Roles(RoleName.ADMINISTRADOR)
  resolver(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ResolverReporteDto,
  ) {
    return this.service.resolver(id, user.sub, dto);
  }

  @Get('reservas')
  reservas(@CurrentUser() user: JwtPayload) {
    return this.service.reservas(user.sub);
  }
  @Post('turnos/:id/completar')
  completar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.completar(user.sub, id);
  }
  @Post('turnos/:id/resena')
  resenar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CrearResenaDto,
  ) {
    return this.service.resenar(user.sub, id, dto);
  }
  @Post('turnos/:id/reporte')
  reportar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CrearReporteDto,
  ) {
    return this.service.reportar(user.sub, id, dto);
  }
  @Get(':id/:categoria/perfil')
  perfil(
    @Param('id', ParseIntPipe) id: number,
    @Param('categoria', new ParseEnumPipe(CategoriaServicio))
    categoria: CategoriaServicio,
  ) {
    return this.service.perfil(id, categoria);
  }
}
