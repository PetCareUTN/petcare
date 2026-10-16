import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { User } from '../users/entities/user.entity';
import { SolicitudCompartirMascota } from './entities/solicitud-compartir-mascota.entity';
import { MascotasCompartidasController } from './mascotas-compartidas.controller';
import { MascotasCompartidasService } from './mascotas-compartidas.service';

@Module({
  imports: [
    AuthModule,
    NotificacionesModule,
    TypeOrmModule.forFeature([SolicitudCompartirMascota, Mascota, User]),
  ],
  controllers: [MascotasCompartidasController],
  providers: [MascotasCompartidasService],
})
export class MascotasCompartidasModule {}
