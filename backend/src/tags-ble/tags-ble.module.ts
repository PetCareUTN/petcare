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
})
export class TagsBleModule {}
