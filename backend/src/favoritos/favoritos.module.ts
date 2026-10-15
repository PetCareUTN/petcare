import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PublicacionAdopcion } from '../adopciones/entities/publicacion-adopcion.entity';
import { Favorito } from './entities/favorito.entity';
import { FavoritosController } from './favoritos.controller';
import { FavoritosService } from './favoritos.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Favorito, PublicacionAdopcion]),
  ],
  controllers: [FavoritosController],
  providers: [FavoritosService],
})
export class FavoritosModule {}
