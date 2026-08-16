import {
  Body,
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VeterinarioValidadoGuard } from '../auth/guards/veterinario-validado.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleName } from '../common/enums/role-name.enum';
import { UserPublicDto } from '../users/dto/user-public.dto';
import { CreateMascotaDto } from './dto/create-mascota.dto';
import { MascotaResponseDto } from './dto/mascota-response.dto';
import { UpdateMascotaDto } from './dto/update-mascota.dto';
import { MascotasService } from './mascotas.service';
import type { UploadedImageFile } from './types/uploaded-image-file.type';

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_IN_BYTES = 2 * 1024 * 1024;

const imageFileFilter = (
  _req: unknown,
  file: UploadedImageFile,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    callback(
      new BadRequestException({
        codigoEstado: 400,
        mensaje: 'La foto debe ser una imagen JPG, PNG o WEBP',
      }),
      false,
    );
    return;
  }

  callback(null, true);
};

@Controller('mascotas')
export class MascotasController {
  constructor(private readonly mascotasService: MascotasService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('foto', {
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_IMAGE_SIZE_IN_BYTES },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMascotaDto,
    @UploadedFile() foto?: UploadedImageFile,
  ): Promise<MascotaResponseDto> {
    return this.mascotasService.create(user.sub, dto, foto);
  }

  @Get('duenos/buscar')
  @UseGuards(JwtAuthGuard, RolesGuard, VeterinarioValidadoGuard)
  @Roles(RoleName.VETERINARIO)
  findOwner(
    @Query('email') email?: string,
    @Query('documento') documento?: string,
  ): Promise<UserPublicDto> {
    return this.mascotasService.findOwner(email, documento);
  }

  @Get('duenos/:idUsuario')
  @UseGuards(JwtAuthGuard, RolesGuard, VeterinarioValidadoGuard)
  @Roles(RoleName.VETERINARIO)
  findByOwner(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
  ): Promise<MascotaResponseDto[]> {
    return this.mascotasService.findAllByOwnerId(idUsuario);
  }

  @Post('duenos/:idUsuario')
  @UseGuards(JwtAuthGuard, RolesGuard, VeterinarioValidadoGuard)
  @UseInterceptors(
    FileInterceptor('foto', {
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_IMAGE_SIZE_IN_BYTES },
    }),
  )
  @Roles(RoleName.VETERINARIO)
  @HttpCode(HttpStatus.CREATED)
  createForExistingOwner(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Body() dto: CreateMascotaDto,
    @UploadedFile() foto?: UploadedImageFile,
  ): Promise<MascotaResponseDto> {
    return this.mascotasService.createForExistingOwner(idUsuario, dto, foto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: JwtPayload): Promise<MascotaResponseDto[]> {
    return this.mascotasService.findAllByUser(user.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query('ownerDocument') ownerDocument?: string,
    @Query('ownerEmail') ownerEmail?: string,
  ): Promise<MascotaResponseDto> {
    return this.mascotasService.findOne(id, user, { ownerDocument, ownerEmail });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('foto', {
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_IMAGE_SIZE_IN_BYTES },
    }),
  )
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMascotaDto,
    @UploadedFile() foto?: UploadedImageFile,
  ): Promise<MascotaResponseDto> {
    return this.mascotasService.update(id, user.sub, dto, foto);
  }
}
