import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ConfirmarCambioEmailDto } from './dto/confirmar-cambio-email.dto';
import { SolicitarCambioEmailDto } from './dto/solicitar-cambio-email.dto';
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

  @Post('me/cambiar-email')
  @UseGuards(JwtAuthGuard)
  async cambiarEmail(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SolicitarCambioEmailDto,
  ) {
    return this.usersService.solicitarCambioEmail(user.sub, dto.nuevoEmail);
  }

  @Patch('me/confirmar-email')
  @UseGuards(JwtAuthGuard)
  async confirmarEmail(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ConfirmarCambioEmailDto,
  ) {
    return this.usersService.confirmarCambioEmail(user.sub, dto.codigo);
  }
}
