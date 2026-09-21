import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesPerdidaModule } from '../reportes-perdida/reportes-perdida.module';
import { TagBle } from '../tags-ble/entities/tag-ble.entity';
import { DeteccionesController } from './detecciones.controller';
import { DeteccionesService } from './detecciones.service';
import { Deteccion } from './entities/deteccion.entity';

@Module({
  imports: [
    ReportesPerdidaModule,
    TypeOrmModule.forFeature([Deteccion, TagBle]),
  ],
  controllers: [DeteccionesController],
  providers: [DeteccionesService],
})
export class DeteccionesModule {}
