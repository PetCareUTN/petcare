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
import { EventoClinico } from './eventos-clinicos/entities/evento-clinico.entity';
import { ArchivoMedico } from './eventos-clinicos/entities/archivo-medico.entity';
import { EventosClinicosModule } from './eventos-clinicos/eventos-clinicos.module';
import { HistoriaClinica } from './historias-clinicas/entities/historia-clinica.entity';
import { AdopcionesModule } from './adopciones/adopciones.module';
import { PublicacionAdopcion } from './adopciones/entities/publicacion-adopcion.entity';
import { Servicio } from './servicios/entities/servicio.entity';
import { DisponibilidadServicio } from './servicios/entities/disponibilidad-servicio.entity';
import { ServiciosModule } from './servicios/servicios.module';
import { DisponibilidadesVeterinariasModule } from './disponibilidades-veterinarias/disponibilidades-veterinarias.module';
import { DisponibilidadVeterinaria } from './disponibilidades-veterinarias/entities/disponibilidad-veterinaria.entity';
import { TurnoVeterinario } from './turnos-veterinarios/entities/turno-veterinario.entity';
import { TurnosVeterinariosModule } from './turnos-veterinarios/turnos-veterinarios.module';
import { AuditoriaUsuario } from './admin/entities/auditoria-usuario.entity';
import { AdminModule } from './admin/admin.module';
import { SolicitudAdopcion } from './solicitudes-adopcion/entities/solicitud-adopcion.entity';
import { SolicitudesAdopcionModule } from './solicitudes-adopcion/solicitudes-adopcion.module';
import { TurnoServicio } from './turnos-servicios/entities/turno-servicio.entity';
import { TurnosServiciosModule } from './turnos-servicios/turnos-servicios.module';

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
      entities: [
        User,
        Role,
        Mascota,
        Veterinario,
        Notificacion,
        HistoriaClinica,
        EventoClinico,
        ArchivoMedico,
        PublicacionAdopcion,
        Servicio,
        DisponibilidadServicio,
        DisponibilidadVeterinaria,
        TurnoVeterinario,
        AuditoriaUsuario,
        SolicitudAdopcion,
        TurnoServicio,
      ],
      synchronize: false,
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    MascotasModule,
    VeterinariosModule,
    NotificacionesModule,
    MailModule,
    EventosClinicosModule,
    AdopcionesModule,
    ServiciosModule,
    DisponibilidadesVeterinariasModule,
    TurnosVeterinariosModule,
    AdminModule,
    SolicitudesAdopcionModule,
    TurnosServiciosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
