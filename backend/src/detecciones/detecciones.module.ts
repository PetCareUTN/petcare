import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ReportesPerdidaModule } from '../reportes-perdida/reportes-perdida.module';
import { TagBle } from '../tags-ble/entities/tag-ble.entity';
import { DeteccionesController } from './detecciones.controller';
import { DeteccionesService } from './detecciones.service';
import { Deteccion } from './entities/deteccion.entity';

@Module({
  imports: [
    // US-37 consulta la última detección y necesita el JwtAuthGuard.
    AuthModule,
    // US-41 avisa al dueño cuando entra una detección de su mascota.
    NotificacionesModule,
    ReportesPerdidaModule,
    TypeOrmModule.forFeature([Deteccion, TagBle]),
  ],
  controllers: [DeteccionesController],
  providers: [DeteccionesService],
})
export class DeteccionesModule {}
