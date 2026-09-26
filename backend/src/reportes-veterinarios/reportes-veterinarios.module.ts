import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DisponibilidadVeterinaria } from '../disponibilidades-veterinarias/entities/disponibilidad-veterinaria.entity';
import { TurnoVeterinario } from '../turnos-veterinarios/entities/turno-veterinario.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { ReportesVeterinariosController } from './reportes-veterinarios.controller';
import { ReportesVeterinariosService } from './reportes-veterinarios.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([TurnoVeterinario, DisponibilidadVeterinaria, Veterinario]),
  ],
  controllers: [ReportesVeterinariosController],
  providers: [ReportesVeterinariosService],
})
export class ReportesVeterinariosModule {}
