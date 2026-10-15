import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '../../common/enums/role-name.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: {
    getAllAndOverride: jest.Mock<RoleName[] | undefined, [string, unknown[]]>;
  };

  class TestController {}
  const testHandler = jest.fn();

  const buildContext = (user?: unknown): ExecutionContext =>
    ({
      getHandler: () => testHandler,
      getClass: () => TestController,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  const buildUser = (rol: RoleName | string) => ({
    sub: 1,
    email: 'admin@petcare.test',
    idRol: 1,
    rol,
  });

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn<RoleName[] | undefined, [string, unknown[]]>(),
    };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows access when the user role is required by the route', () => {
    reflector.getAllAndOverride.mockReturnValue([RoleName.ADMINISTRADOR]);

    const result = guard.canActivate(
      buildContext(buildUser(RoleName.ADMINISTRADOR)),
    );

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      testHandler,
      TestController,
    ]);
    expect(result).toBe(true);
  });

  it('denies access when the user role is not allowed', () => {
    reflector.getAllAndOverride.mockReturnValue([RoleName.ADMINISTRADOR]);

    expect(() =>
      guard.canActivate(buildContext(buildUser(RoleName.VETERINARIO))),
    ).toThrow(ForbiddenException);
  });

  it('allows access when the route does not declare role metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(buildContext())).toBe(true);
  });

  it('denies access when the JWT payload has an invalid role', () => {
    reflector.getAllAndOverride.mockReturnValue([RoleName.ADMINISTRADOR]);

    expect(() =>
      guard.canActivate(buildContext(buildUser('INVALID_ROLE'))),
    ).toThrow(ForbiddenException);
  });
});
