import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VeterinarioValidadoGuard } from '../auth/guards/veterinario-validado.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleName } from '../common/enums/role-name.enum';
import { CreateSobreturnoVeterinarioDto } from './dto/create-sobreturno-veterinario.dto';
import { SobreturnoVeterinarioResponseDto } from './dto/sobreturno-veterinario-response.dto';
import { SobreturnosVeterinariosService } from './sobreturnos-veterinarios.service';

@Controller('sobreturnos-veterinarios')
@UseGuards(JwtAuthGuard, RolesGuard, VeterinarioValidadoGuard)
@Roles(RoleName.VETERINARIO)
export class SobreturnosVeterinariosController {
  constructor(
    private readonly sobreturnosService: SobreturnosVeterinariosService,
  ) {}

  @Post('mios')
  @HttpCode(HttpStatus.CREATED)
  crear(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSobreturnoVeterinarioDto,
  ): Promise<SobreturnoVeterinarioResponseDto> {
    return this.sobreturnosService.crear(user.sub, dto);
  }

  @Get('mios')
  listarMios(
    @CurrentUser() user: JwtPayload,
    @Query('fecha') fecha?: string,
  ): Promise<SobreturnoVeterinarioResponseDto[]> {
    return this.sobreturnosService.listarMios(user.sub, fecha);
  }

  @Delete(':idSobreturno')
  @HttpCode(HttpStatus.OK)
  async eliminar(
    @CurrentUser() user: JwtPayload,
    @Param('idSobreturno', ParseIntPipe) idSobreturno: number,
  ): Promise<{ mensaje: string }> {
    await this.sobreturnosService.eliminar(user.sub, idSobreturno);
    return { mensaje: 'Sobreturno eliminado' };
  }
}
