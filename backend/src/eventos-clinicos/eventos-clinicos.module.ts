import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { HistoriaClinica } from '../historias-clinicas/entities/historia-clinica.entity';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { EventosClinicosController } from './eventos-clinicos.controller';
import { EventosClinicosService } from './eventos-clinicos.service';
import { EventoClinico } from './entities/evento-clinico.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      EventoClinico,
      HistoriaClinica,
      Mascota,
      Veterinario,
    ]),
  ],
  controllers: [EventosClinicosController],
  providers: [EventosClinicosService],
  exports: [TypeOrmModule],
})
export class EventosClinicosModule {}
