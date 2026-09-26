import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { TagBle } from './entities/tag-ble.entity';
import { TagsBleController } from './tags-ble.controller';
import { TagsBleService } from './tags-ble.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([TagBle, Mascota])],
  controllers: [TagsBleController],
  providers: [TagsBleService],
  // Lo usa NotificacionesModule para resolver a qué mascota pertenece el tag
  // que avisó una separación (US-34).
  exports: [TagsBleService],
})
export class TagsBleModule {}
