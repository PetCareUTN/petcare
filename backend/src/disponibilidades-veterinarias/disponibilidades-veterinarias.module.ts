import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { DisponibilidadesVeterinariasController } from './disponibilidades-veterinarias.controller';
import { DisponibilidadesVeterinariasService } from './disponibilidades-veterinarias.service';
import { DisponibilidadVeterinaria } from './entities/disponibilidad-veterinaria.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([DisponibilidadVeterinaria, Veterinario]),
  ],
  controllers: [DisponibilidadesVeterinariasController],
  providers: [DisponibilidadesVeterinariasService],
})
export class DisponibilidadesVeterinariasModule {}
