import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PublicacionAdopcion } from '../adopciones/entities/publicacion-adopcion.entity';
import { User } from '../users/entities/user.entity';
import { SolicitudAdopcion } from './entities/solicitud-adopcion.entity';
import { SolicitudesAdopcionController } from './solicitudes-adopcion.controller';
import { SolicitudesAdopcionService } from './solicitudes-adopcion.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([SolicitudAdopcion, PublicacionAdopcion, User]),
  ],
  controllers: [SolicitudesAdopcionController],
  providers: [SolicitudesAdopcionService],
})
export class SolicitudesAdopcionModule {}
