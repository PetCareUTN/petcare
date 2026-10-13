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
import {
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EtiquetasApi } from '../common/constants/documentacion-api';
import {
  ApiDatosInvalidos,
  ApiNoEncontrado,
  ApiProtegido,
} from '../common/decorators/api-protegido.decorator';
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

@ApiTags(EtiquetasApi.MASCOTAS)
@ApiProtegido()
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
  @ApiOperation({
    summary: 'Registrar una mascota propia',
    description:
      'La foto es opcional y va en el mismo formulario. Debe ser JPG, PNG o WEBP y pesar hasta 2 MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Mascota creada.',
    type: MascotaResponseDto,
  })
  @ApiDatosInvalidos('Datos inválidos, o la foto no es una imagen permitida.')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMascotaDto,
    @UploadedFile() foto?: UploadedImageFile,
  ): Promise<MascotaResponseDto> {
    return this.mascotasService.create(user.sub, dto, foto);
  }

  @Get('duenos/buscar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @ApiProtegido(RoleName.VETERINARIO)
  @ApiOperation({
    summary: 'Buscar un dueño por email o documento',
    description:
      'Lo usa la veterinaria para encontrar al dueño exacto antes de cargarle una mascota o una atención.',
  })
  @ApiQuery({ name: 'email', required: false, example: 'ana@example.com' })
  @ApiQuery({ name: 'documento', required: false, example: '31456789' })
  @ApiResponse({ status: 200, description: 'Dueño encontrado.', type: UserPublicDto })
  @ApiNoEncontrado('No hay ningún dueño con ese email o documento.')
  findOwner(
    @Query('email') email?: string,
    @Query('documento') documento?: string,
  ): Promise<UserPublicDto> {
    return this.mascotasService.findOwner(email, documento);
  }

  @Get('duenos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @ApiProtegido(RoleName.VETERINARIO)
  @ApiOperation({
    summary: 'Listar dueños filtrando por nombre o apellido',
    description: 'Sin filtros devuelve todos los dueños.',
  })
  @ApiQuery({ name: 'nombre', required: false, example: 'Ana' })
  @ApiQuery({ name: 'apellido', required: false, example: 'Lopez' })
  @ApiResponse({
    status: 200,
    description: 'Dueños que coinciden.',
    type: [UserPublicDto],
  })
  findAllOwners(
    @Query('nombre') nombre?: string,
    @Query('apellido') apellido?: string,
  ): Promise<UserPublicDto[]> {
    return this.mascotasService.findAllOwners(nombre, apellido);
  }

  @Get('duenos/:idUsuario')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VETERINARIO)
  @ApiProtegido(RoleName.VETERINARIO)
  @ApiOperation({ summary: 'Listar las mascotas de un dueño' })
  @ApiResponse({
    status: 200,
    description: 'Mascotas del dueño.',
    type: [MascotaResponseDto],
  })
  @ApiNoEncontrado('El dueño no existe.')
  findByOwner(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
  ): Promise<MascotaResponseDto[]> {
    return this.mascotasService.findAllByOwnerId(idUsuario);
  }

  @Post('duenos/:idUsuario')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(
    FileInterceptor('foto', {
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_IMAGE_SIZE_IN_BYTES },
    }),
  )
  @Roles(RoleName.VETERINARIO)
  @HttpCode(HttpStatus.CREATED)
  @ApiProtegido(RoleName.VETERINARIO)
  @ApiOperation({
    summary: 'Registrar una mascota a nombre de un dueño',
    description:
      'Lo usa la veterinaria cuando el dueño llega al consultorio con una mascota que todavía no está cargada.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Mascota creada para ese dueño.',
    type: MascotaResponseDto,
  })
  @ApiNoEncontrado('El dueño no existe.')
  createForExistingOwner(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Body() dto: CreateMascotaDto,
    @UploadedFile() foto?: UploadedImageFile,
  ): Promise<MascotaResponseDto> {
    return this.mascotasService.createForExistingOwner(idUsuario, dto, foto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar mis mascotas' })
  @ApiResponse({
    status: 200,
    description: 'Mascotas de la sesión actual.',
    type: [MascotaResponseDto],
  })
  findAll(@CurrentUser() user: JwtPayload): Promise<MascotaResponseDto[]> {
    return this.mascotasService.findAllByUser(user.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Ver una mascota',
    description:
      'El dueño ve las suyas. La veterinaria puede ver la de otro dueño identificándolo con ownerDocument u ownerEmail.',
  })
  @ApiQuery({ name: 'ownerDocument', required: false })
  @ApiQuery({ name: 'ownerEmail', required: false })
  @ApiResponse({ status: 200, description: 'Datos de la mascota.', type: MascotaResponseDto })
  @ApiNoEncontrado('La mascota no existe o no es accesible para esta sesión.')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query('ownerDocument') ownerDocument?: string,
    @Query('ownerEmail') ownerEmail?: string,
  ): Promise<MascotaResponseDto> {
    return this.mascotasService.findOne(id, user, {
      ownerDocument,
      ownerEmail,
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('foto', {
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_IMAGE_SIZE_IN_BYTES },
    }),
  )
  @ApiOperation({
    summary: 'Editar una mascota propia',
    description: 'Se mandan sólo los campos que cambian. La foto reemplaza a la anterior.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Mascota actualizada.', type: MascotaResponseDto })
  @ApiNoEncontrado('La mascota no existe o no es de esta sesión.')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMascotaDto,
    @UploadedFile() foto?: UploadedImageFile,
  ): Promise<MascotaResponseDto> {
    return this.mascotasService.update(id, user.sub, dto, foto);
  }
}
