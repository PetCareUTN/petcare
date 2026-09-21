import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { EventoClinico } from '../eventos-clinicos/entities/evento-clinico.entity';
import { Notificacion } from './entities/notificacion.entity';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesDeteccionesService } from './notificaciones-detecciones.service';
import { NotificacionesTurnosService } from './notificaciones-turnos.service';
import { NotificacionesService } from './notificaciones.service';
import { RecordatoriosVacunasService } from './recordatorios-vacunas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notificacion, EventoClinico]), AuthModule],
  controllers: [NotificacionesController],
  providers: [
    NotificacionesService,
    NotificacionesDeteccionesService,
    NotificacionesTurnosService,
    RecordatoriosVacunasService,
  ],
  exports: [
    NotificacionesService,
    NotificacionesDeteccionesService,
    NotificacionesTurnosService,
    RecordatoriosVacunasService,
  ],
})
export class NotificacionesModule {}
