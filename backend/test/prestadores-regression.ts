/** Ejecutar con: npx ts-node test/prestadores-regression.ts
 * Usa PostgreSQL local y revierte todos los datos de prueba, incluso si falla.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ForbiddenException } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  EntityTarget,
  ObjectLiteral,
} from 'typeorm';
import source from '../src/data-source';
import { RoleName } from '../src/common/enums/role-name.enum';
import { ValidationStatus } from '../src/common/enums/validation-status.enum';
import { CategoriaServicio } from '../src/common/enums/categoria-servicio.enum';
import { DiaSemana } from '../src/common/enums/dia-semana.enum';
import { Role } from '../src/roles/entities/role.entity';
import { User } from '../src/users/entities/user.entity';
import { Veterinario } from '../src/veterinarios/entities/veterinario.entity';
import { Servicio } from '../src/servicios/entities/servicio.entity';
import { DisponibilidadServicio } from '../src/servicios/entities/disponibilidad-servicio.entity';
import { ServiciosService } from '../src/servicios/servicios.service';
import { PrestadoresService } from '../src/prestadores/prestadores.service';
import { SolicitudPrestador } from '../src/prestadores/entities/solicitud-prestador.entity';

async function main() {
  assert(
    ['localhost', '127.0.0.1', '::1'].includes(
      process.env.DATABASE_HOST ?? 'localhost',
    ),
    'Esta prueba solo se ejecuta contra PostgreSQL local.',
  );
  await source.initialize();
  const runner = source.createQueryRunner();
  const prefix = `regression-${randomUUID()}`;
  const emails: string[] = [];
  try {
    await runner.connect();
    await runner.startTransaction();
    const em = runner.manager;
    // Todos los servicios usan repositorios reales dentro de una sola
    // transacción de prueba, incluyendo las notificaciones internas.
    const scoped = {
      getRepository: <T extends ObjectLiteral>(target: EntityTarget<T>) =>
        em.getRepository(target),
      transaction: <T>(work: (manager: EntityManager) => Promise<T>) =>
        work(em),
    } as unknown as DataSource;
    const prestadores = new PrestadoresService(scoped);
    const servicios = new ServiciosService(
      em.getRepository(Servicio),
      em.getRepository(DisponibilidadServicio),
      em.getRepository(User),
      prestadores,
    );
    async function usuario(nombre: string, rol: RoleName) {
      const email = `${prefix}-${nombre}@example.invalid`;
      emails.push(email);
      return em.save(
        User,
        em.create(User, {
          nombre: 'Prueba de regresión',
          apellido: nombre,
          email,
          password: 'SIN-ACCESO-DE-PRUEBA',
          estado: 'activo',
          rol: await em.findOneByOrFail(Role, { nombre: rol }),
        }),
      );
    }
    const dueno = await usuario('dueno', RoleName.DUENO_MASCOTA);
    const vet = await usuario('veterinario', RoleName.VETERINARIO);
    const admin = await usuario('admin', RoleName.ADMINISTRADOR);
    const profesional = await em.save(
      Veterinario,
      em.create(Veterinario, {
        usuario: vet,
        numeroDocumento: '12345678',
        numeroMatricula: 'PRUEBA',
        provinciaMatricula: 'Prueba',
        matriculaUrl: 'prueba-no-publica',
        habilitacionUrl: 'prueba-no-publica',
        estadoValidacion: ValidationStatus.APROBADO,
      }),
    );
    const publicacion = {
      categoria: CategoriaServicio.PASEADOR,
      descripcion: 'Prueba que se revierte',
      disponibilidades: [
        { diaSemana: DiaSemana.LUNES, horaInicio: '09:00', horaFin: '12:00' },
      ],
    };

    await assert.rejects(
      servicios.create(dueno.idUsuario, publicacion),
      ForbiddenException,
    );
    const servicioVet = await servicios.create(vet.idUsuario, publicacion);
    assert.equal(
      await em.countBy(SolicitudPrestador, { idUsuario: vet.idUsuario }),
      0,
    );
    assert(
      (await servicios.findAll()).some(
        (s) => s.idServicio === servicioVet.idServicio,
      ),
    );

    const solicitud = await prestadores.solicitar(
      dueno.idUsuario,
      {
        categoria: CategoriaServicio.PASEADOR,
        nombreCompleto: 'Persona de prueba',
        numeroDocumento: '12345678',
        telefono: '1112345678',
        experiencia:
          'Experiencia ficticia para una prueba de integración local.',
        protocolo:
          'Protocolo ficticio de cuidados, prevención de escapes y atención de emergencias para la prueba.',
        consentimiento: 'true',
      },
      [
        {
          fieldname: 'identidad',
          buffer: Buffer.from('%PDF-1.7 prueba de integración'),
        } as Express.Multer.File,
      ],
    );
    await assert.rejects(
      servicios.create(dueno.idUsuario, publicacion),
      ForbiddenException,
    );
    const pendiente = await em.findOneByOrFail(SolicitudPrestador, {
      id: solicitud.id,
    });
    await prestadores.revisar(pendiente.id, admin.idUsuario, {
      estado: 'aprobado',
      motivo: 'Revisión ficticia de integración que se revierte.',
      version: pendiente.actualizada.toISOString(),
      identidadRevisada: true,
      contactoVerificado: true,
      condicionesRevisadas: true,
      referenciasComprobadas: false,
    });
    const servicioDueno = await servicios.create(dueno.idUsuario, publicacion);
    await assert.rejects(
      prestadores.exigirAprobado(dueno.idUsuario, CategoriaServicio.GUARDERIA),
      ForbiddenException,
    );
    assert(
      (await servicios.findAll()).some(
        (s) => s.idServicio === servicioDueno.idServicio,
      ),
    );
    assert.equal(
      (await prestadores.perfil(vet.idUsuario, CategoriaServicio.PASEADOR))
        .serviciosCompletados,
      0,
    );

    await em.update(
      SolicitudPrestador,
      { id: solicitud.id },
      { estado: 'suspendido' },
    );
    const visibles = await servicios.findAll();
    assert(!visibles.some((s) => s.idServicio === servicioDueno.idServicio));
    assert(visibles.some((s) => s.idServicio === servicioVet.idServicio));
    await assert.rejects(
      prestadores.exigirAprobado(dueno.idUsuario, CategoriaServicio.PASEADOR),
      ForbiddenException,
    );

    await em.update(
      Veterinario,
      { idVeterinario: profesional.idVeterinario },
      { estadoValidacion: ValidationStatus.RECHAZADO },
    );
    await assert.rejects(
      prestadores.exigirAprobado(vet.idUsuario, CategoriaServicio.PASEADOR),
      ForbiddenException,
    );
    assert(
      !(await servicios.findAll()).some(
        (s) => s.idServicio === servicioVet.idServicio,
      ),
    );
    await runner.rollbackTransaction();
    for (const email of emails)
      assert.equal(await source.getRepository(User).countBy({ email }), 0);
    console.log(
      'Integración PostgreSQL aprobada: alta Android, revisión administrativa, validación veterinaria existente, catálogo y suspensión. Datos de prueba revertidos.',
    );
  } finally {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    await runner.release();
    await source.destroy();
  }
}
void main().catch((error: unknown) => {
  // Evita volcar consultas o datos personales en la salida de las pruebas.
  console.error(
    error instanceof Error ? error.message : 'Error de integración',
  );
  process.exitCode = 1;
});
