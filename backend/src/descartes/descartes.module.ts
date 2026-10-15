import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicacionAdopcion } from '../adopciones/entities/publicacion-adopcion.entity';
import { AuthModule } from '../auth/auth.module';
import { DescartesController } from './descartes.controller';
import { DescartesService } from './descartes.service';
import { DescarteAdopcion } from './entities/descarte-adopcion.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([DescarteAdopcion, PublicacionAdopcion]),
  ],
  controllers: [DescartesController],
  providers: [DescartesService],
})
export class DescartesModule {}
