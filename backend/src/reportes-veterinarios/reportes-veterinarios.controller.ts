import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EtiquetasApi } from '../common/constants/documentacion-api';
import { ApiProtegido } from '../common/decorators/api-protegido.decorator';
import { RoleName } from '../common/enums/role-name.enum';
import { ReporteDashboardQueryDto } from './dto/reporte-dashboard-query.dto';
import { ReportesVeterinariosService } from './reportes-veterinarios.service';

@ApiTags(EtiquetasApi.HISTORIA_CLINICA)
@ApiProtegido(RoleName.VETERINARIO)
@Controller('reportes-veterinarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.VETERINARIO)
export class ReportesVeterinariosController {
  constructor(private readonly reportesService: ReportesVeterinariosService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Ver el tablero de la veterinaria',
    description:
      'Totales de atenciones y turnos del período. Sin fechas usa el período por defecto del servicio.',
  })
  @ApiResponse({ status: 200, description: 'Métricas del período pedido.' })
  obtenerDashboard(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReporteDashboardQueryDto,
  ) {
    return this.reportesService.obtenerDashboard(user.sub, query.desde, query.hasta);
  }
}
