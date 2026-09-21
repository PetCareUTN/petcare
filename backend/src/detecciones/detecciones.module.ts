import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ReportesPerdidaModule } from '../reportes-perdida/reportes-perdida.module';
import { TagBle } from '../tags-ble/entities/tag-ble.entity';
import { DeteccionesController } from './detecciones.controller';
import { DeteccionesService } from './detecciones.service';
import { Deteccion } from './entities/deteccion.entity';

@Module({
  imports: [
    // US-37 consulta la última detección y necesita el JwtAuthGuard.
    AuthModule,
    ReportesPerdidaModule,
    TypeOrmModule.forFeature([Deteccion, TagBle]),
  ],
  controllers: [DeteccionesController],
  providers: [DeteccionesService],
})
export class DeteccionesModule {}
