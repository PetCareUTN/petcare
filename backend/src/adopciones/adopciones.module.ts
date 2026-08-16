import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import type ms from 'ms';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { User } from '../users/entities/user.entity';
import { AdopcionesController } from './adopciones.controller';
import { AdopcionesService } from './adopciones.service';
import { PublicacionAdopcion } from './entities/publicacion-adopcion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PublicacionAdopcion, Mascota, User]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: {
          expiresIn: (process.env.JWT_EXPIRES_IN ?? '1d') as ms.StringValue,
        },
      }),
    }),
  ],
  controllers: [AdopcionesController],
  providers: [AdopcionesService],
  exports: [AdopcionesService],
})
export class AdopcionesModule {}
