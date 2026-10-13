/*
 * Carga un juego de datos de demostración en una base vacía.
 *
 * Pensado para el ambiente desplegado, que arranca sin nada y por lo tanto no
 * permite mostrar ningún flujo: sin veterinarias aprobadas no hay a quién
 * pedirle turno, y sin mascotas no hay historia clínica que ver.
 *
 * Uso, desde backend/:
 *
 *   DATABASE_URL="postgresql://..." DEMO_PASSWORD="laQueElijan" npm run seed:demo
 *
 * La contraseña NO se versiona: se pasa por variable de entorno y es la misma
 * para todas las cuentas de demo, para que sea fácil de mostrar. Elegí una
 * distinta de cualquier contraseña real.
 *
 * Es idempotente: si una cuenta de demo ya existe, la saltea. Se puede correr
 * varias veces sin duplicar nada.
 *
 * Solo toca filas propias (las que tienen email @demo.petcare.test), así que no
 * pisa datos cargados a mano.
 */
const bcrypt = require('bcrypt');
const { Client } = require('pg');

const DOMINIO_DEMO = 'demo.petcare.test';

const DUENIOS = [
  {
    nombre: 'Lucía',
    apellido: 'Fernández',
    email: `lucia@${DOMINIO_DEMO}`,
    documento: '30111222',
    telefono: '3511234567',
    mascotas: [
      {
        nombre: 'Luna',
        especie: 'Perro',
        raza: 'Mestiza',
        sexo: 'hembra',
        fechaNacimiento: '2021-03-14',
        peso: '18.50',
        esterilizado: true,
        observaciones: 'Muy sociable con otros perros.',
      },
      {
        nombre: 'Milo',
        especie: 'Gato',
        raza: 'Siamés',
        sexo: 'macho',
        fechaNacimiento: '2023-07-02',
        peso: '4.20',
        esterilizado: false,
        observaciones: 'Asustadizo en la consulta.',
      },
    ],
  },
  {
    nombre: 'Martín',
    apellido: 'Gómez',
    email: `martin@${DOMINIO_DEMO}`,
    documento: '28999888',
    telefono: '3517654321',
    mascotas: [
      {
        nombre: 'Rocco',
        especie: 'Perro',
        raza: 'Labrador',
        sexo: 'macho',
        fechaNacimiento: '2019-11-30',
        peso: '32.00',
        esterilizado: true,
        observaciones: 'Displasia de cadera leve, en control.',
      },
    ],
  },
];

const VETERINARIA = {
  nombre: 'Sofía',
  apellido: 'Rivas',
  email: `veterinaria@${DOMINIO_DEMO}`,
  documento: '27555444',
  telefono: '3519998877',
  direccion: 'Av. Colón 1234, Córdoba',
  matricula: 'MP-4821',
  provincia: 'Córdoba',
};

/*
 * Evento clínico de ejemplo, para que la historia clínica no esté vacía.
 * Se usa tipo 'consulta' a propósito: un evento de 'vacuna' exige además el
 * tipo de vacuna y las fechas de dosis (US-40), y cargarlo a mano desde acá
 * dejaría un registro a medias.
 */
const EVENTO_DE_EJEMPLO = {
  mascota: 'Luna',
  tipo: 'consulta',
  descripcion: 'Control anual. Peso y temperatura dentro de lo esperado.',
  diagnostico: 'Paciente sana.',
  tratamiento: 'Continuar con alimento balanceado. Próximo control en 12 meses.',
};

const ADOPCION_DE_EJEMPLO = {
  nombre: 'Canela',
  especie: 'Perro',
  raza: 'Caniche',
  sexo: 'hembra',
  fechaNacimiento: '2024-01-20',
  peso: '6.80',
  esterilizado: true,
  observaciones: 'Rescatada de la calle, en tránsito.',
  descripcion:
    'Canela busca familia. Es tranquila, convive bien con otros perros y ya ' +
    'está vacunada y esterilizada. Ideal para departamento.',
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const password = process.env.DEMO_PASSWORD;

  if (!databaseUrl) {
    throw new Error(
      'Falta DATABASE_URL. Copiala del servicio Postgres en Railway.',
    );
  }
  if (!password || password.length < 8) {
    throw new Error(
      'Falta DEMO_PASSWORD, o tiene menos de 8 caracteres (el mínimo que pide el registro).',
    );
  }

  // El Postgres local no habla TLS y los administrados lo exigen, con un
  // certificado de una CA propia que Node no conoce (de ahí rejectUnauthorized
  // en false). Se decide por el host, y DATABASE_SSL lo pisa si hace falta.
  const esLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(databaseUrl);
  const usarSsl =
    process.env.DATABASE_SSL !== undefined
      ? process.env.DATABASE_SSL === 'true'
      : !esLocal;

  const client = new Client({
    connectionString: databaseUrl,
    ssl: usarSsl ? { rejectUnauthorized: false } : false,
  });
  await client.connect();

  try {
    await client.query('BEGIN');

    const hash = await bcrypt.hash(password, 10);
    const roles = await obtenerRoles(client);

    for (const duenio of DUENIOS) {
      const idUsuario = await crearUsuario(client, duenio, roles.duenio, hash);
      for (const mascota of duenio.mascotas) {
        await crearMascota(client, idUsuario, mascota);
      }
    }

    const idUsuarioVeterinaria = await crearUsuario(
      client,
      VETERINARIA,
      roles.veterinario,
      hash,
    );
    const idVeterinario = await crearVeterinarioAprobado(
      client,
      idUsuarioVeterinaria,
    );
    await crearSuscripcionActiva(client, idUsuarioVeterinaria);
    await crearEventoClinico(client, idVeterinario);
    await crearPublicacionDeAdopcion(client, roles.duenio, hash);

    await client.query('COMMIT');

    console.log('\nDatos de demostración cargados.\n');
    console.log('Cuentas creadas (todas con la contraseña de DEMO_PASSWORD):');
    for (const duenio of DUENIOS) {
      console.log(`  ${duenio.email}  (dueño de mascota)`);
    }
    console.log(`  ${VETERINARIA.email}  (veterinaria, aprobada y con suscripción activa)`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

async function obtenerRoles(client) {
  const { rows } = await client.query(
    `SELECT id_rol, nombre FROM roles WHERE nombre IN ('dueño_mascota', 'veterinario')`,
  );
  const porNombre = Object.fromEntries(rows.map((r) => [r.nombre, r.id_rol]));

  if (!porNombre['dueño_mascota'] || !porNombre['veterinario']) {
    throw new Error(
      'Faltan los roles en la base. Corré primero database/seeders/01-roles.sql.',
    );
  }
  return { duenio: porNombre['dueño_mascota'], veterinario: porNombre['veterinario'] };
}

/** Devuelve el id del usuario, creándolo solo si no existía. */
async function crearUsuario(client, persona, idRol, hash) {
  const existente = await client.query(
    'SELECT id_usuario FROM usuarios WHERE email = $1',
    [persona.email],
  );
  if (existente.rowCount > 0) {
    console.log(`- ya existía: ${persona.email}`);
    return existente.rows[0].id_usuario;
  }

  const { rows } = await client.query(
    `INSERT INTO usuarios (nombre, apellido, email, telefono, direccion, numero_documento, password, id_rol)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id_usuario`,
    [
      persona.nombre,
      persona.apellido,
      persona.email,
      persona.telefono ?? null,
      persona.direccion ?? null,
      persona.documento,
      hash,
      idRol,
    ],
  );
  console.log(`+ usuario: ${persona.email}`);
  return rows[0].id_usuario;
}

/** Crea la mascota con su historia clínica y la asocia al dueño. */
async function crearMascota(client, idUsuario, mascota) {
  const existente = await client.query(
    `SELECT m.id_mascota FROM mascotas m
     JOIN usuarios_mascotas um ON um.id_mascota = m.id_mascota
     WHERE m.nombre = $1 AND um.id_usuario = $2`,
    [mascota.nombre, idUsuario],
  );
  if (existente.rowCount > 0) {
    console.log(`- ya existía la mascota ${mascota.nombre}`);
    return existente.rows[0].id_mascota;
  }

  const historia = await client.query(
    'INSERT INTO historias_clinicas DEFAULT VALUES RETURNING id_historia',
  );

  const { rows } = await client.query(
    `INSERT INTO mascotas
       (nombre, especie, raza, sexo, fecha_nacimiento, peso, esterilizado, observaciones, id_historia)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id_mascota`,
    [
      mascota.nombre,
      mascota.especie,
      mascota.raza,
      mascota.sexo,
      mascota.fechaNacimiento,
      mascota.peso,
      mascota.esterilizado,
      mascota.observaciones,
      historia.rows[0].id_historia,
    ],
  );

  await client.query(
    'INSERT INTO usuarios_mascotas (id_usuario, id_mascota) VALUES ($1, $2)',
    [idUsuario, rows[0].id_mascota],
  );
  console.log(`+ mascota: ${mascota.nombre}`);
  return rows[0].id_mascota;
}

/**
 * La veterinaria queda APROBADA directamente: si quedara pendiente, no podría
 * ni iniciar sesión hasta que un administrador la valide a mano.
 */
async function crearVeterinarioAprobado(client, idUsuario) {
  const existente = await client.query(
    'SELECT id_veterinario FROM veterinarios WHERE id_usuario = $1',
    [idUsuario],
  );
  if (existente.rowCount > 0) {
    return existente.rows[0].id_veterinario;
  }

  const { rows } = await client.query(
    `INSERT INTO veterinarios
       (id_usuario, numero_documento, numero_matricula, provincia_matricula, matricula_url, estado_validacion)
     VALUES ($1, $2, $3, $4, $5, 'APROBADO')
     RETURNING id_veterinario`,
    [
      idUsuario,
      VETERINARIA.documento,
      VETERINARIA.matricula,
      VETERINARIA.provincia,
      '/uploads/matriculas/demo.pdf',
    ],
  );
  console.log('+ veterinaria aprobada');
  return rows[0].id_veterinario;
}

/**
 * Sin suscripción activa, un veterinario queda bloqueado en casi toda la
 * plataforma por el interceptor de acceso. Para la demo se deja ACTIVA con
 * vencimiento a un año, sin pasar por Mercado Pago.
 */
async function crearSuscripcionActiva(client, idUsuario) {
  const existente = await client.query(
    'SELECT id_suscripcion FROM suscripciones WHERE id_usuario = $1',
    [idUsuario],
  );
  if (existente.rowCount > 0) {
    await client.query(
      `UPDATE suscripciones SET estado = 'ACTIVA',
         fecha_vencimiento = now() + interval '1 year'
       WHERE id_usuario = $1`,
      [idUsuario],
    );
    return;
  }

  await client.query(
    `INSERT INTO suscripciones (id_usuario, estado, fecha_inicio, fecha_vencimiento)
     VALUES ($1, 'ACTIVA', now(), now() + interval '1 year')`,
    [idUsuario],
  );
  console.log('+ suscripción activa para la veterinaria');
}

/** Un evento en la historia de Luna, para que la pantalla no esté vacía. */
async function crearEventoClinico(client, idVeterinario) {
  const mascota = await client.query(
    'SELECT id_historia FROM mascotas WHERE nombre = $1 AND id_historia IS NOT NULL LIMIT 1',
    [EVENTO_DE_EJEMPLO.mascota],
  );
  if (mascota.rowCount === 0) return;

  const idHistoria = mascota.rows[0].id_historia;
  const existente = await client.query(
    'SELECT id_evento FROM eventos_clinicos WHERE id_historia = $1',
    [idHistoria],
  );
  if (existente.rowCount > 0) return;

  await client.query(
    `INSERT INTO eventos_clinicos
       (id_historia, id_veterinario, tipo, fecha, descripcion, diagnostico, tratamiento)
     VALUES ($1, $2, $3, CURRENT_DATE - 30, $4, $5, $6)`,
    [
      idHistoria,
      idVeterinario,
      EVENTO_DE_EJEMPLO.tipo,
      EVENTO_DE_EJEMPLO.descripcion,
      EVENTO_DE_EJEMPLO.diagnostico,
      EVENTO_DE_EJEMPLO.tratamiento,
    ],
  );
  console.log('+ evento clínico de ejemplo');
}

/** Una mascota publicada en adopción, a nombre del primer dueño de demo. */
async function crearPublicacionDeAdopcion(client, idRolDuenio, hash) {
  const idUsuario = await crearUsuario(client, DUENIOS[0], idRolDuenio, hash);
  const idMascota = await crearMascota(client, idUsuario, ADOPCION_DE_EJEMPLO);

  const existente = await client.query(
    'SELECT id_publicacion FROM publicaciones_adopcion WHERE id_mascota = $1',
    [idMascota],
  );
  if (existente.rowCount > 0) return;

  await client.query(
    `INSERT INTO publicaciones_adopcion (id_mascota, id_usuario, descripcion)
     VALUES ($1, $2, $3)`,
    [idMascota, idUsuario, ADOPCION_DE_EJEMPLO.descripcion],
  );
  console.log('+ publicación de adopción');
}

main().catch((error) => {
  console.error('\nFalló la carga de datos de demostración:');
  console.error(error.message);
  process.exit(1);
});
