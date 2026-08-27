import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Notificacion } from './entities/notificacion.entity';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesTurnosService } from './notificaciones-turnos.service';
import { NotificacionesService } from './notificaciones.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notificacion]), AuthModule],
  controllers: [NotificacionesController],
  providers: [NotificacionesService, NotificacionesTurnosService],
  exports: [NotificacionesService, NotificacionesTurnosService],
})
export class NotificacionesModule {}
