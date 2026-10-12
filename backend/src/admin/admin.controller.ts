import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RoleName } from '../common/enums/role-name.enum';
import { AdminService } from './admin.service';
import { CambiarRolDto } from './dto/cambiar-rol.dto';
import { AuditoriaResponseDto } from './dto/auditoria-response.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMINISTRADOR)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('usuarios')
  async listarUsuarios(
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    const pag = pagina ? parseInt(pagina, 10) : 1;
    const lim = limite ? parseInt(limite, 10) : 20;

    const { usuarios, total } = await this.adminService.listarUsuarios(
      pag,
      lim,
      busqueda,
    );

    return {
      usuarios,
      total,
      pagina: pag,
      limite: lim,
    };
  }

  @Get('usuarios/:id')
  async obtenerUsuario(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.obtenerUsuarioAdmin(id);
  }

  @Patch('usuarios/:id/rol')
  async cambiarRol(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarRolDto,
  ) {
    await this.adminService.cambiarRol(id, dto.idRol);
    return this.adminService.obtenerUsuarioAdmin(id);
  }

  @Get('roles')
  async listarRoles() {
    return this.adminService.listarRoles();
  }

  @Get('usuarios/:id/auditoria')
  async obtenerHistorial(@Param('id', ParseIntPipe) id: number) {
    const historial = await this.adminService.obtenerHistorial(id);
    return historial.map((registro) =>
      AuditoriaResponseDto.fromEntity(registro),
    );
  }
}
