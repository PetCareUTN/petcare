import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SuscripcionesController } from './suscripciones.controller';
import { SuscripcionesService } from './suscripciones.service';

describe('SuscripcionesController', () => {
  let controller: SuscripcionesController;
  let suscripcionesService: { urlRetornoFrontend: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuscripcionesController],
      providers: [
        {
          provide: SuscripcionesService,
          useValue: {
            urlRetornoFrontend: jest.fn(),
          },
        },
      ],
    })
      // Los guards de los otros endpoints dependen de JwtService/Reflector;
      // en el test de unidad del controlador los reemplazamos por unos que
      // siempre permiten el acceso (mismo criterio que users.controller.spec).
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SuscripcionesController>(SuscripcionesController);
    suscripcionesService = module.get(SuscripcionesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('retorno', () => {
    it('redirige con 302 a la pantalla de suscripción del frontend', () => {
      suscripcionesService.urlRetornoFrontend.mockReturnValue(
        'http://localhost:4200/suscripciones',
      );
      const redirect = jest.fn();
      const res = { redirect } as unknown as Response;

      controller.retorno(res);

      expect(redirect).toHaveBeenCalledWith(
        HttpStatus.FOUND,
        'http://localhost:4200/suscripciones',
      );
      expect(suscripcionesService.urlRetornoFrontend).toHaveBeenCalledTimes(1);
    });
  });
});
