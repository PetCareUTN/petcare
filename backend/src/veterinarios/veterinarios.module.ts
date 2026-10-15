import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { RolesModule } from '../roles/roles.module';
import { Suscripcion } from '../suscripciones/entities/suscripcion.entity';
import { UsersModule } from '../users/users.module';
import { Veterinario } from './entities/veterinario.entity';
import { VeterinariosController } from './veterinarios.controller';
import { VeterinariosService } from './veterinarios.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Veterinario, Suscripcion]),
    AuthModule,
    GeocodingModule,
    NotificacionesModule,
    RolesModule,
    UsersModule,
  ],
  controllers: [VeterinariosController],
  providers: [VeterinariosService],
  exports: [VeterinariosService],
})
export class VeterinariosModule {}
