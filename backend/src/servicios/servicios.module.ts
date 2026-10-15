import { Module } from '@nestjs/common';
import { PrestadoresModule } from '../prestadores/prestadores.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/entities/user.entity';
import { DisponibilidadServicio } from './entities/disponibilidad-servicio.entity';
import { Servicio } from './entities/servicio.entity';
import { ServiciosController } from './servicios.controller';
import { ServiciosService } from './servicios.service';

@Module({
  imports: [
    PrestadoresModule,
    AuthModule,
    TypeOrmModule.forFeature([Servicio, DisponibilidadServicio, User]),
  ],
  controllers: [ServiciosController],
  providers: [ServiciosService],
  exports: [TypeOrmModule],
})
export class ServiciosModule {}
