import {
  Body,
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateMascotaDto } from './dto/create-mascota.dto';
import { MascotaResponseDto } from './dto/mascota-response.dto';
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

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MascotaResponseDto> {
    return this.mascotasService.findOne(id, user.sub);
  }
}
