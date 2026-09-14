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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateReportePerdidaDto } from './dto/create-reporte-perdida.dto';
import { ReportePerdidaResponseDto } from './dto/reporte-perdida-response.dto';
import { ReportesPerdidaService } from './reportes-perdida.service';

@Controller('reportes-perdida')
export class ReportesPerdidaController {
  constructor(
    private readonly reportesPerdidaService: ReportesPerdidaService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  reportar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateReportePerdidaDto,
  ): Promise<ReportePerdidaResponseDto> {
    return this.reportesPerdidaService.crear(user.sub, dto);
  }

  @Get('mios')
  @UseGuards(JwtAuthGuard)
  listarMios(
    @CurrentUser() user: JwtPayload,
  ): Promise<ReportePerdidaResponseDto[]> {
    return this.reportesPerdidaService.listarActivosDelUsuario(user.sub);
  }

  @Patch(':id/cerrar')
  @UseGuards(JwtAuthGuard)
  cerrar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ReportePerdidaResponseDto> {
    return this.reportesPerdidaService.cerrar(id, user.sub);
  }
}
