import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { ReportePerdida } from './entities/reporte-perdida.entity';
import { ReportesPerdidaController } from './reportes-perdida.controller';
import { ReportesPerdidaService } from './reportes-perdida.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([ReportePerdida, Mascota])],
  controllers: [ReportesPerdidaController],
  providers: [ReportesPerdidaService],
  // La ingesta de detecciones BLE (US-31) necesita saber si una mascota tiene
  // un reporte abierto antes de aceptar una detección.
  exports: [ReportesPerdidaService],
})
export class ReportesPerdidaModule {}
