import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { AccesoPlataformaInterceptor } from './acceso-plataforma.interceptor';
import { PagoSuscripcion } from './entities/pago-suscripcion.entity';
import { Suscripcion } from './entities/suscripcion.entity';
import {
  SuscripcionesAdminController,
  SuscripcionesController,
} from './suscripciones.controller';
import { SuscripcionesService } from './suscripciones.service';

@Module({
  imports: [
    AuthModule,
    NotificacionesModule,
    TypeOrmModule.forFeature([Suscripcion, PagoSuscripcion, Veterinario]),
  ],
  controllers: [SuscripcionesController, SuscripcionesAdminController],
  providers: [
    SuscripcionesService,
    // Control centralizado de acceso por suscripción (HTTP 402) para todo
    // request de un veterinario autenticado.
    { provide: APP_INTERCEPTOR, useClass: AccesoPlataformaInterceptor },
  ],
  exports: [SuscripcionesService],
})
export class SuscripcionesModule {}
