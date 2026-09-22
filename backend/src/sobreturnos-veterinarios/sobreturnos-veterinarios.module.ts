import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { SobreturnoVeterinario } from './entities/sobreturno-veterinario.entity';
import { SobreturnosVeterinariosController } from './sobreturnos-veterinarios.controller';
import { SobreturnosVeterinariosService } from './sobreturnos-veterinarios.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([SobreturnoVeterinario, Veterinario]),
  ],
  controllers: [SobreturnosVeterinariosController],
  providers: [SobreturnosVeterinariosService],
  exports: [SobreturnosVeterinariosService],
})
export class SobreturnosVeterinariosModule {}
