import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { EventoClinico } from '../eventos-clinicos/entities/evento-clinico.entity';
import { DispositivoPush } from './entities/dispositivo-push.entity';
import { Notificacion } from './entities/notificacion.entity';
import { DispositivosPushService } from './dispositivos-push.service';
import { NotificacionesController } from './notificaciones.controller';
import { PushService } from './push.service';
import { NotificacionesDeteccionesService } from './notificaciones-detecciones.service';
import { NotificacionesTurnosService } from './notificaciones-turnos.service';
import { NotificacionesSeparacionService } from './notificaciones-separacion.service';
import { NotificacionesService } from './notificaciones.service';
import { RecordatoriosVacunasService } from './recordatorios-vacunas.service';
import { TagsBleModule } from '../tags-ble/tags-ble.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notificacion, DispositivoPush, EventoClinico]),
    AuthModule,
    TagsBleModule,
  ],
  controllers: [NotificacionesController],
  providers: [
    NotificacionesService,
    PushService,
    DispositivosPushService,
    NotificacionesDeteccionesService,
    NotificacionesSeparacionService,
    NotificacionesTurnosService,
    RecordatoriosVacunasService,
  ],
  exports: [
    NotificacionesService,
    NotificacionesDeteccionesService,
    NotificacionesSeparacionService,
    NotificacionesTurnosService,
    RecordatoriosVacunasService,
  ],
})
export class NotificacionesModule {}
