import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { VeterinarioValidadoGuard } from '../auth/guards/veterinario-validado.guard';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { Veterinario } from './entities/veterinario.entity';
import { VeterinariosController } from './veterinarios.controller';
import { VeterinariosService } from './veterinarios.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Veterinario]),
    AuthModule,
    NotificacionesModule,
  ],
  controllers: [VeterinariosController],
  providers: [VeterinariosService, VeterinarioValidadoGuard],
  exports: [VeterinariosService],
})
export class VeterinariosModule {}
