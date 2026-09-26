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
import { Throttle } from '@nestjs/throttler';
import { RoleName } from '../common/enums/role-name.enum';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { CreateAssistedOwnerDto } from './dto/create-assisted-owner.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LimiteIntentosGuard } from './guards/limite-intentos.guard';
import { RolesGuard } from './guards/roles.guard';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserPublicDto } from '../users/dto/user-public.dto';
import { CambiarContraseñaDto } from './dto/cambiar-contrasena.dto';
import { OlvideContrasenaDto } from './dto/olvide-contrasena.dto';
import { RestablecerContrasenaDto } from './dto/restablecer-contrasena.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { GoogleRegisterDto } from './dto/google-register.dto';
import { GoogleLoginResponseDto } from './dto/google-login-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(LimiteIntentosGuard)
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(LimiteIntentosGuard)
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  // Paso 1: valida el token de Google. Devuelve la sesión, o avisa que falta el DNI.
  @Post('google')
  @UseGuards(LimiteIntentosGuard)
  @HttpCode(HttpStatus.OK)
  loginConGoogle(@Body() dto: GoogleLoginDto): Promise<GoogleLoginResponseDto> {
    return this.authService.loginConGoogle(dto);
  }

  // Paso 2: crea la cuenta con los datos de Google más el DNI.
  @Post('google/registro')
  @UseGuards(LimiteIntentosGuard)
  @HttpCode(HttpStatus.CREATED)
  registrarConGoogle(
    @Body() dto: GoogleRegisterDto,
  ): Promise<GoogleLoginResponseDto> {
    return this.authService.registrarConGoogle(dto);
  }

  @Post('duenos/alta-asistida')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  createAssistedOwner(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAssistedOwnerDto,
  ): Promise<{ mensaje: string; usuario: UserPublicDto }> {
    return this.authService.createAssistedOwner(dto, user.sub);
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

  // Con sesión, pero pide la contraseña actual: sin límite, alguien con el
  // celular desbloqueado de otro podría adivinarla.
  @Patch('cambiar-contrasena')
  @UseGuards(JwtAuthGuard, LimiteIntentosGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CambiarContraseñaDto,
  ) {
    return this.authService.changePassword(user.sub, dto);
  }

  // Más estricto que el login: cada llamada manda un mail, y sin límite se
  // puede usar para inundar la casilla de alguien o gastar la cuota de envío.
  @Post('olvide-contrasena')
  @UseGuards(LimiteIntentosGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: OlvideContrasenaDto) {
    return this.authService.forgotPassword(dto.email);
  }

  // Además de este límite por IP, AuthService invalida el código a los 5
  // intentos fallidos, que es lo que frena a quien reparte intentos entre IPs.
  @Patch('restablecer-contrasena')
  @UseGuards(LimiteIntentosGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: RestablecerContrasenaDto) {
    return this.authService.resetPassword(dto);
  }
}
