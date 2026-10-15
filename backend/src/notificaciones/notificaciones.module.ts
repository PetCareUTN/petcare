import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { EventoClinico } from '../eventos-clinicos/entities/evento-clinico.entity';
import { Notificacion } from './entities/notificacion.entity';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesDeteccionesService } from './notificaciones-detecciones.service';
import { NotificacionesTurnosService } from './notificaciones-turnos.service';
import { NotificacionesSeparacionService } from './notificaciones-separacion.service';
import { NotificacionesService } from './notificaciones.service';
import { RecordatoriosVacunasService } from './recordatorios-vacunas.service';
import { TagsBleModule } from '../tags-ble/tags-ble.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notificacion, EventoClinico]),
    AuthModule,
    TagsBleModule,
  ],
  controllers: [NotificacionesController],
  providers: [
    NotificacionesService,
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
