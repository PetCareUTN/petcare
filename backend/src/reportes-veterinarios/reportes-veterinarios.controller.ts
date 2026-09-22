import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VeterinarioValidadoGuard } from '../auth/guards/veterinario-validado.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleName } from '../common/enums/role-name.enum';
import { ReporteDashboardQueryDto } from './dto/reporte-dashboard-query.dto';
import { ReportesVeterinariosService } from './reportes-veterinarios.service';

@Controller('reportes-veterinarios')
@UseGuards(JwtAuthGuard, RolesGuard, VeterinarioValidadoGuard)
@Roles(RoleName.VETERINARIO)
export class ReportesVeterinariosController {
  constructor(private readonly reportesService: ReportesVeterinariosService) {}

  @Get('dashboard')
  obtenerDashboard(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReporteDashboardQueryDto,
  ) {
    return this.reportesService.obtenerDashboard(user.sub, query.desde, query.hasta);
  }
}
