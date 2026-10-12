import { SuscripcionEstado } from '../../common/enums/suscripcion-estado.enum';
import { ValidationStatus } from '../../common/enums/validation-status.enum';
import { Suscripcion } from '../../suscripciones/entities/suscripcion.entity';
import { User } from '../../users/entities/user.entity';
import { Veterinario } from '../../veterinarios/entities/veterinario.entity';
import { UsuarioAdminResponseDto } from './usuario-admin-response.dto';

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    idUsuario: 1,
    nombre: 'Ana',
    apellido: 'Perez',
    email: 'ana@test.com',
    numeroDocumento: '30111222',
    telefono: '1155555555',
    direccion: 'Calle Falsa 123',
    rol: { idRol: 3, nombre: 'veterinario' },
    fechaRegistro: new Date('2026-01-01'),
    estado: 'activo',
    ...overrides,
  }) as User;

const makeVet = (estadoValidacion: ValidationStatus): Veterinario =>
  ({ estadoValidacion }) as Veterinario;

const makeSub = (estado: SuscripcionEstado): Suscripcion =>
  ({ estado }) as Suscripcion;

describe('UsuarioAdminResponseDto', () => {
  it('para un usuario que no es veterinario devuelve su estado genérico', () => {
    const user = makeUser({ estado: 'inactivo' });
    const dto = UsuarioAdminResponseDto.fromEntity(user);
    expect(dto.estado).toBe('inactivo');
  });

  it('veterinario con validación PENDIENTE devuelve pendiente_validacion aunque tenga suscripción', () => {
    const user = makeUser({
      veterinario: makeVet(ValidationStatus.PENDIENTE),
    });
    const dto = UsuarioAdminResponseDto.fromEntity(
      user,
      makeSub(SuscripcionEstado.ACTIVA),
    );
    expect(dto.estado).toBe('pendiente_validacion');
  });

  it('veterinario RECHAZADO devuelve rechazado', () => {
    const user = makeUser({
      veterinario: makeVet(ValidationStatus.RECHAZADO),
    });
    const dto = UsuarioAdminResponseDto.fromEntity(user);
    expect(dto.estado).toBe('rechazado');
  });

  it('veterinario APROBADO sin suscripción devuelve pendiente_pago', () => {
    const user = makeUser({
      veterinario: makeVet(ValidationStatus.APROBADO),
    });
    const dto = UsuarioAdminResponseDto.fromEntity(user, null);
    expect(dto.estado).toBe('pendiente_pago');
  });

  it('veterinario APROBADO con suscripción ACTIVA devuelve activa', () => {
    const user = makeUser({
      veterinario: makeVet(ValidationStatus.APROBADO),
    });
    const dto = UsuarioAdminResponseDto.fromEntity(
      user,
      makeSub(SuscripcionEstado.ACTIVA),
    );
    expect(dto.estado).toBe('activa');
  });

  it('veterinario APROBADO con suscripción CANCELADA devuelve cancelada', () => {
    const user = makeUser({
      veterinario: makeVet(ValidationStatus.APROBADO),
    });
    const dto = UsuarioAdminResponseDto.fromEntity(
      user,
      makeSub(SuscripcionEstado.CANCELADA),
    );
    expect(dto.estado).toBe('cancelada');
  });

  it('mapea el resto de los campos del usuario', () => {
    const dto = UsuarioAdminResponseDto.fromEntity(makeUser());
    expect(dto).toMatchObject({
      id_usuario: 1,
      nombre: 'Ana',
      apellido: 'Perez',
      email: 'ana@test.com',
      nombre_rol: 'veterinario',
      id_rol: 3,
    });
  });
});
