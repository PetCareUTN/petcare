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
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EtiquetasApi } from '../common/constants/documentacion-api';
import {
  ApiConflicto,
  ApiNoEncontrado,
  ApiProtegido,
} from '../common/decorators/api-protegido.decorator';
import { CreateReportePerdidaDto } from './dto/create-reporte-perdida.dto';
import { ReportePerdidaResponseDto } from './dto/reporte-perdida-response.dto';
import { ReportesPerdidaService } from './reportes-perdida.service';

@ApiTags(EtiquetasApi.LOCALIZACION_BLE)
@ApiProtegido()
@Controller('reportes-perdida')
export class ReportesPerdidaController {
  constructor(
    private readonly reportesPerdidaService: ReportesPerdidaService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Reportar una mascota como perdida',
    description:
      'A partir de acá se empiezan a guardar las detecciones de su tag Bluetooth que informen otros celulares.',
  })
  @ApiResponse({
    status: 201,
    description: 'Reporte creado.',
    type: ReportePerdidaResponseDto,
  })
  @ApiConflicto('Esa mascota ya tiene un reporte abierto.')
  @ApiNoEncontrado('La mascota no existe o no es de esta sesión.')
  reportar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateReportePerdidaDto,
  ): Promise<ReportePerdidaResponseDto> {
    return this.reportesPerdidaService.crear(user.sub, dto);
  }

  @Get('mios')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar mis reportes de pérdida abiertos' })
  @ApiResponse({
    status: 200,
    description: 'Reportes activos de la sesión actual.',
    type: [ReportePerdidaResponseDto],
  })
  listarMios(
    @CurrentUser() user: JwtPayload,
  ): Promise<ReportePerdidaResponseDto[]> {
    return this.reportesPerdidaService.listarActivosDelUsuario(user.sub);
  }

  @Patch(':id/cerrar')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Cerrar un reporte: la mascota apareció',
    description: 'Deja de registrar detecciones de ese tag.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte cerrado.',
    type: ReportePerdidaResponseDto,
  })
  @ApiNoEncontrado('El reporte no existe o no es de esta sesión.')
  cerrar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ReportePerdidaResponseDto> {
    return this.reportesPerdidaService.cerrar(id, user.sub);
  }
}
