import { BadRequestException } from '@nestjs/common';
import type { UploadedImageFile } from '../../mascotas/types/uploaded-image-file.type';

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE_IN_BYTES = 2 * 1024 * 1024;

/** Filtro de multer para fotos: sólo JPG, PNG o WEBP. */
export const imageFileFilter = (
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
