import { Module } from '@nestjs/common';
import { PrestadoresModule } from '../prestadores/prestadores.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { Servicio } from '../servicios/entities/servicio.entity';
import { TurnoServicio } from './entities/turno-servicio.entity';
import { TurnosServiciosController } from './turnos-servicios.controller';
import { TurnosServiciosService } from './turnos-servicios.service';

@Module({
  imports: [
    PrestadoresModule,
    AuthModule,
    NotificacionesModule,
    TypeOrmModule.forFeature([TurnoServicio, Servicio, Mascota]),
  ],
  controllers: [TurnosServiciosController],
  providers: [TurnosServiciosService],
})
export class TurnosServiciosModule {}
