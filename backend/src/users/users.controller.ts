import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LimiteIntentosGuard } from '../auth/guards/limite-intentos.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ConfirmarCambioEmailDto } from './dto/confirmar-cambio-email.dto';
import { SolicitarCambioEmailDto } from './dto/solicitar-cambio-email.dto';
import { UpdatePreferenciasDto } from './dto/update-preferencias.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserPublicDto } from './dto/user-public.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateUserDto,
  ): Promise<UserPublicDto> {
    const updatedUser = await this.usersService.update(user.sub, dto);
    return UserPublicDto.fromEntity(updatedUser);
  }

  /** Preferencias de notificaciones del usuario autenticado (US-40). */
  @Patch('me/preferencias')
  @UseGuards(JwtAuthGuard)
  async updatePreferencias(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdatePreferenciasDto,
  ): Promise<UserPublicDto> {
    const updatedUser = await this.usersService.updatePreferencias(
      user.sub,
      dto,
    );
    return UserPublicDto.fromEntity(updatedUser);
  }

  // Manda un mail por llamada: mismo limite que olvide-contrasena.
  @Post('me/cambiar-email')
  @UseGuards(JwtAuthGuard, LimiteIntentosGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async cambiarEmail(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SolicitarCambioEmailDto,
  ) {
    return this.usersService.solicitarCambioEmail(user.sub, dto.nuevoEmail);
  }

  // Codigo de 6 digitos: sin limite se podria adivinar.
  @Patch('me/confirmar-email')
  @UseGuards(JwtAuthGuard, LimiteIntentosGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async confirmarEmail(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ConfirmarCambioEmailDto,
  ) {
    return this.usersService.confirmarCambioEmail(user.sub, dto.codigo);
  }
}
