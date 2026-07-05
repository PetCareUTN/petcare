import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type ms from 'ms';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    UsersModule,
    RolesModule,
    // registerAsync + useFactory: los valores se leen cuando Nest instancia el
    // módulo (ya con dotenv.config() ejecutado en app.module), no en tiempo de
    // import, para que JWT_SECRET esté disponible.
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: {
          expiresIn: (process.env.JWT_EXPIRES_IN ?? '1d') as ms.StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
