import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DisponibilidadVeterinaria } from '../disponibilidades-veterinarias/entities/disponibilidad-veterinaria.entity';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { Turno } from './entities/turno.entity';
import { TurnosController } from './turnos.controller';
import { TurnosService } from './turnos.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Turno, Mascota, Veterinario, DisponibilidadVeterinaria]),
  ],
  controllers: [TurnosController],
  providers: [TurnosService],
})
export class TurnosModule {}
