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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  ESQUEMA_AUTENTICACION,
  EtiquetasApi,
} from '../common/constants/documentacion-api';
import { ErrorRespuestaDto } from '../common/dto/error-respuesta.dto';
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

@ApiTags(EtiquetasApi.USUARIOS)
@ApiResponse({
  status: 429,
  description:
    'Demasiados intentos desde la misma IP. Hay que esperar antes de reintentar.',
  type: ErrorRespuestaDto,
})
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(LimiteIntentosGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar una cuenta nueva',
    description:
      'Crea un usuario con rol dueño de mascota. El email y el documento no se pueden repetir.',
  })
  @ApiResponse({ status: 201, description: 'Cuenta creada.', type: RegisterResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Campos obligatorios faltantes o inválidos.',
    type: ErrorRespuestaDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe una cuenta con ese email o documento.',
    type: ErrorRespuestaDto,
  })
  register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(LimiteIntentosGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Devuelve el token JWT que piden el resto de los endpoints protegidos. Es el que se pega en el botón Authorize.',
  })
  @ApiResponse({ status: 200, description: 'Sesión iniciada.', type: LoginResponseDto })
  @ApiResponse({
    status: 401,
    description: 'Email o contraseña incorrectos.',
    type: ErrorRespuestaDto,
  })
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Post('google')
  @UseGuards(LimiteIntentosGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión con Google (paso 1)',
    description:
      'Valida el token de Google. Si la persona ya tiene cuenta devuelve la sesión; si es la primera vez avisa que falta el documento y hay que seguir por POST /auth/google/registro.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sesión iniciada, o aviso de que falta completar el documento.',
    type: GoogleLoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'El token de Google no es válido.',
    type: ErrorRespuestaDto,
  })
  loginConGoogle(@Body() dto: GoogleLoginDto): Promise<GoogleLoginResponseDto> {
    return this.authService.loginConGoogle(dto);
  }

  @Post('google/registro')
  @UseGuards(LimiteIntentosGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Iniciar sesión con Google (paso 2)',
    description:
      'Crea la cuenta con los datos que trae Google más el documento, que Google no provee.',
  })
  @ApiResponse({
    status: 201,
    description: 'Cuenta creada y sesión iniciada.',
    type: GoogleLoginResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe una cuenta con ese email o documento.',
    type: ErrorRespuestaDto,
  })
  registrarConGoogle(
    @Body() dto: GoogleRegisterDto,
  ): Promise<GoogleLoginResponseDto> {
    return this.authService.registrarConGoogle(dto);
  }

  @Post('duenos/alta-asistida')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @ApiBearerAuth(ESQUEMA_AUTENTICACION)
  @ApiOperation({
    summary: 'Dar de alta a un dueño desde la veterinaria',
    description:
      'Rol requerido: veterinario. Crea la cuenta de un dueño que llegó al consultorio sin registrarse, para poder cargarle la mascota y la atención.',
  })
  @ApiResponse({ status: 201, description: 'Dueño creado.' })
  @ApiResponse({
    status: 403,
    description: 'La sesión no es de un veterinario.',
    type: ErrorRespuestaDto,
  })
  createAssistedOwner(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAssistedOwnerDto,
  ): Promise<{ mensaje: string; usuario: UserPublicDto }> {
    return this.authService.createAssistedOwner(dto, user.sub);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth(ESQUEMA_AUTENTICACION)
  @ApiOperation({
    summary: 'Ver el perfil de la sesión actual',
    description: 'Devuelve los datos del usuario dueño del token.',
  })
  @ApiResponse({ status: 200, description: 'Perfil del usuario.', type: UserPublicDto })
  @ApiResponse({
    status: 401,
    description: 'Falta el token o venció.',
    type: ErrorRespuestaDto,
  })
  me(@CurrentUser() user: JwtPayload): Promise<UserPublicDto> {
    return this.authService.getProfile(user.sub);
  }

  @Get('admin-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMINISTRADOR)
  @ApiBearerAuth(ESQUEMA_AUTENTICACION)
  @ApiOperation({
    summary: 'Comprobar el acceso de administrador',
    description:
      'Rol requerido: administrador. Endpoint de prueba, sirve para verificar que el token y el rol funcionan.',
  })
  @ApiResponse({ status: 200, description: 'El token corresponde a un administrador.' })
  @ApiResponse({
    status: 403,
    description: 'La sesión no es de un administrador.',
    type: ErrorRespuestaDto,
  })
  adminTest(): { mensaje: string } {
    return { mensaje: 'Acceso autorizado para administrador' };
  }

  // Con sesión, pero pide la contraseña actual: sin límite, alguien con el
  // celular desbloqueado de otro podría adivinarla.
  @Patch('cambiar-contrasena')
  @UseGuards(JwtAuthGuard, LimiteIntentosGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiBearerAuth(ESQUEMA_AUTENTICACION)
  @ApiOperation({
    summary: 'Cambiar la contraseña con la sesión abierta',
    description:
      'Pide la contraseña actual además de la nueva. Límite: 5 intentos por minuto y por IP.',
  })
  @ApiResponse({ status: 200, description: 'Contraseña cambiada.' })
  @ApiResponse({
    status: 401,
    description: 'La contraseña actual no coincide, o falta el token.',
    type: ErrorRespuestaDto,
  })
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
  @ApiOperation({
    summary: 'Pedir el código para restablecer la contraseña',
    description:
      'Envía por mail un código de un solo uso. Responde lo mismo exista o no la cuenta, para no revelar qué emails están registrados. Límite: 5 por minuto y por IP.',
  })
  @ApiResponse({ status: 200, description: 'Si la cuenta existe, se envió el mail.' })
  async forgotPassword(@Body() dto: OlvideContrasenaDto) {
    return this.authService.forgotPassword(dto.email);
  }

  // Además de este límite por IP, AuthService invalida el código a los 5
  // intentos fallidos, que es lo que frena a quien reparte intentos entre IPs.
  @Patch('restablecer-contrasena')
  @UseGuards(LimiteIntentosGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restablecer la contraseña con el código del mail',
    description:
      'El código se invalida a los 5 intentos fallidos. Límite: 5 llamadas por minuto y por IP.',
  })
  @ApiResponse({ status: 200, description: 'Contraseña restablecida.' })
  @ApiResponse({
    status: 400,
    description: 'El código es incorrecto o venció.',
    type: ErrorRespuestaDto,
  })
  resetPassword(@Body() dto: RestablecerContrasenaDto) {
    return this.authService.resetPassword(dto);
  }
}
