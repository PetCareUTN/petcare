import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class RegistrarDispositivoDto {
  @ApiProperty({
    description:
      'Registration token que le dio FCM a la app en este dispositivo.',
    example: 'fviK9s...:APA91bH...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  token: string;

  @ApiPropertyOptional({
    description: 'Hoy solo hay app Android.',
    default: 'android',
  })
  @IsIn(['android'])
  @IsOptional()
  plataforma?: string;
}
