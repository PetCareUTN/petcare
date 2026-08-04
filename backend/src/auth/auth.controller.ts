import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { RoleName } from '../common/enums/role-name.enum';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserPublicDto } from '../users/dto/user-public.dto';
import { CambiarContraseñaDto } from './dto/cambiar-contrasena.dto';
import { OlvideContrasenaDto } from './dto/olvide-contrasena.dto';
import { RestablecerContrasenaDto } from './dto/restablecer-contrasena.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  /** Ruta protegida de demostración: devuelve el perfil del usuario autenticado. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload): Promise<UserPublicDto> {
    return this.authService.getProfile(user.sub);
  }

  /** Ruta protegida de prueba: requiere JWT válido y rol administrador. */
  @Get('admin-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMINISTRADOR)
  adminTest(): { mensaje: string } {
    return { mensaje: 'Acceso autorizado para administrador' };
  }

@Patch('cambiar-contrasena')
@UseGuards(JwtAuthGuard)
async changePassword(
  @CurrentUser() user: JwtPayload,
  @Body() dto: CambiarContraseñaDto,
) {
  return this.authService.changePassword(user.sub, dto);
} 

@Post('olvide-contrasena')
@HttpCode(HttpStatus.OK)
async forgotPassword(@Body() dto: OlvideContrasenaDto) {
  return  this.authService.forgotPassword(dto.email);
}

@Patch('restablecer-contrasena')
@HttpCode(HttpStatus.OK)
resetPassword(
  @Body() dto: RestablecerContrasenaDto,
) {
  return this.authService.resetPassword(dto);
}

}
