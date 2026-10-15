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
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EtiquetasApi } from '../common/constants/documentacion-api';
import {
  ApiNoEncontrado,
  ApiProtegido,
} from '../common/decorators/api-protegido.decorator';
import { RoleName } from '../common/enums/role-name.enum';
import { AdminService } from './admin.service';
import { CambiarRolDto } from './dto/cambiar-rol.dto';
import { AuditoriaResponseDto } from './dto/auditoria-response.dto';

@ApiTags(EtiquetasApi.ADMINISTRACION)
@ApiProtegido(RoleName.ADMINISTRADOR)
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMINISTRADOR)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('usuarios')
  @ApiOperation({
    summary: 'Listar usuarios con paginado',
    description: 'La búsqueda filtra por nombre, apellido, email o documento.',
  })
  @ApiQuery({ name: 'pagina', required: false, example: 1 })
  @ApiQuery({ name: 'limite', required: false, example: 20 })
  @ApiQuery({ name: 'busqueda', required: false, example: 'ana' })
  @ApiResponse({
    status: 200,
    description: 'Página de usuarios con el total para paginar.',
  })
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
  @ApiOperation({ summary: 'Ver el detalle de un usuario' })
  @ApiResponse({ status: 200, description: 'Datos del usuario.' })
  @ApiNoEncontrado('El usuario no existe.')
  async obtenerUsuario(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.obtenerUsuarioAdmin(id);
  }

  @Patch('usuarios/:id/rol')
  @ApiOperation({
    summary: 'Cambiar el rol de un usuario',
    description: 'Queda registrado en la auditoría del usuario.',
  })
  @ApiResponse({ status: 200, description: 'Usuario con su rol nuevo.' })
  @ApiNoEncontrado('El usuario o el rol no existen.')
  async cambiarRol(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarRolDto,
  ) {
    await this.adminService.cambiarRol(id, dto.idRol);
    return this.adminService.obtenerUsuarioAdmin(id);
  }

  @Get('roles')
  @ApiOperation({
    summary: 'Listar los roles disponibles',
    description: 'Para llenar el selector de rol en el panel.',
  })
  @ApiResponse({ status: 200, description: 'Roles del sistema.' })
  async listarRoles() {
    return this.adminService.listarRoles();
  }

  @Get('usuarios/:id/auditoria')
  @ApiOperation({
    summary: 'Ver el historial de cambios de un usuario',
    description: 'Quién cambió qué y cuándo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Registros de auditoría.',
    type: [AuditoriaResponseDto],
  })
  async obtenerHistorial(@Param('id', ParseIntPipe) id: number) {
    const historial = await this.adminService.obtenerHistorial(id);
    return historial.map((registro) =>
      AuditoriaResponseDto.fromEntity(registro),
    );
  }
}
