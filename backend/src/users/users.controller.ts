import {
  BadRequestException,
  Body,
  Controller,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';
import { EtiquetasApi } from '../common/constants/documentacion-api';
import {
  ApiDatosInvalidos,
  ApiProtegido,
} from '../common/decorators/api-protegido.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LimiteIntentosGuard } from '../auth/guards/limite-intentos.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  imageFileFilter,
  MAX_IMAGE_SIZE_IN_BYTES,
} from '../common/utils/image-file-filter.util';
import type { UploadedImageFile } from '../mascotas/types/uploaded-image-file.type';
import { ConfirmarCambioEmailDto } from './dto/confirmar-cambio-email.dto';
import { SolicitarCambioEmailDto } from './dto/solicitar-cambio-email.dto';
import { UpdatePreferenciasDto } from './dto/update-preferencias.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserPublicDto } from './dto/user-public.dto';
import { UsersService } from './users.service';

@ApiTags(EtiquetasApi.USUARIOS)
@ApiProtegido()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Editar mi perfil',
    description:
      'Se mandan sólo los campos que cambian. El teléfono tiene que incluir el código de país para poder usar adopciones.',
  })
  @ApiResponse({ status: 200, description: 'Perfil actualizado.', type: UserPublicDto })
  @ApiDatosInvalidos()
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
  @ApiOperation({ summary: 'Cambiar mis preferencias de notificaciones' })
  @ApiResponse({
    status: 200,
    description: 'Preferencias actualizadas.',
    type: UserPublicDto,
  })
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

  @Patch('me/foto')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('foto', {
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_IMAGE_SIZE_IN_BYTES },
    }),
  )
  @ApiOperation({
    summary: 'Cambiar mi foto de perfil',
    description:
      'Reemplaza la foto anterior. Debe ser JPG, PNG o WEBP y pesar hasta 2 MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Foto actualizada.',
    type: UserPublicDto,
  })
  @ApiDatosInvalidos('Falta la foto o no es una imagen permitida.')
  async updateFoto(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() foto?: UploadedImageFile,
  ): Promise<UserPublicDto> {
    if (!foto) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'Falta la foto',
      });
    }
    const updatedUser = await this.usersService.updateFoto(user.sub, foto);
    return UserPublicDto.fromEntity(updatedUser);
  }

  // Manda un mail por llamada: mismo limite que olvide-contrasena.
  @Post('me/cambiar-email')
  @UseGuards(JwtAuthGuard, LimiteIntentosGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Pedir el cambio de email',
    description:
      'Envía un código de 6 dígitos al email nuevo. El cambio recién se aplica al confirmarlo. Límite: 5 por minuto y por IP.',
  })
  @ApiResponse({ status: 201, description: 'Código enviado al email nuevo.' })
  @ApiDatosInvalidos('El email ya está en uso o no es válido.')
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
  @ApiOperation({
    summary: 'Confirmar el cambio de email con el código',
    description: 'Límite: 5 intentos por minuto y por IP.',
  })
  @ApiResponse({ status: 200, description: 'Email cambiado.' })
  @ApiDatosInvalidos('El código es incorrecto o venció.')
  async confirmarEmail(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ConfirmarCambioEmailDto,
  ) {
    return this.usersService.confirmarCambioEmail(user.sub, dto.codigo);
  }
}
