import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoriaClinica } from '../historias-clinicas/entities/historia-clinica.entity';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { EventoClinico } from './entities/evento-clinico.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventoClinico,
      HistoriaClinica,
      Mascota,
      Veterinario,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class EventosClinicosModule {}
