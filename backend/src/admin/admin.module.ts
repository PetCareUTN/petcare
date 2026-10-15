import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Role } from '../roles/entities/role.entity';
import { Suscripcion } from '../suscripciones/entities/suscripcion.entity';
import { User } from '../users/entities/user.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditoriaUsuario } from './entities/auditoria-usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, AuditoriaUsuario, Suscripcion]),
    AuthModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
