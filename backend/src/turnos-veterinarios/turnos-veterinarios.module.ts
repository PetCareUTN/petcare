import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DisponibilidadVeterinaria } from '../disponibilidades-veterinarias/entities/disponibilidad-veterinaria.entity';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { TurnoVeterinario } from './entities/turno-veterinario.entity';
import { TurnosVeterinariosController } from './turnos-veterinarios.controller';
import { TurnosVeterinariosService } from './turnos-veterinarios.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      TurnoVeterinario,
      Veterinario,
      Mascota,
      DisponibilidadVeterinaria,
    ]),
  ],
  controllers: [TurnosVeterinariosController],
  providers: [TurnosVeterinariosService],
})
export class TurnosVeterinariosModule {}
