import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrestadoresController } from './prestadores.controller';
import { PrestadoresService } from './prestadores.service';
import { CuentaPrestadorGuard } from './cuenta-prestador.guard';

@Module({
  imports: [AuthModule],
  controllers: [PrestadoresController],
  providers: [PrestadoresService, CuentaPrestadorGuard],
  exports: [PrestadoresService],
})
export class PrestadoresModule {}
