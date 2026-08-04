import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { User } from './users/entities/user.entity';
import { Role } from './roles/entities/role.entity';
import { MascotasModule } from './mascotas/mascotas.module';
import { Mascota } from './mascotas/entities/mascota.entity';
import { Veterinario } from './veterinarios/entities/veterinario.entity';
import { VeterinariosModule } from './veterinarios/veterinarios.module';
import { Notificacion } from './notificaciones/entities/notificacion.entity';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { MailModule } from './mail/mail.module';

dotenv.config();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT) || 5432,
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [User, Role, Mascota, Veterinario, Notificacion],
      synchronize: false,
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    MascotasModule,
    VeterinariosModule,
    NotificacionesModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
