import { MigrationInterface, QueryRunner } from 'typeorm';

export class ValidacionPrestadores1788600000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE solicitudes_prestadores (
      id SERIAL PRIMARY KEY, id_usuario integer NOT NULL REFERENCES usuarios(id_usuario),
      categoria varchar(20) NOT NULL CHECK (categoria IN ('paseador','guarderia','peluqueria')),
      estado varchar(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','correccion','aprobado','rechazado','suspendido')),
      datos jsonb NOT NULL, "identidadRevisada" boolean NOT NULL DEFAULT false,
      "contactoVerificado" boolean NOT NULL DEFAULT false, "referenciasComprobadas" boolean NOT NULL DEFAULT false,
      historial jsonb NOT NULL DEFAULT '[]', actualizada timestamptz NOT NULL DEFAULT now(),
      UNIQUE(id_usuario, categoria))`);
    await q.query(`CREATE TABLE documentos_prestadores (
      id SERIAL PRIMARY KEY, "idSolicitud" integer NOT NULL REFERENCES solicitudes_prestadores(id) ON DELETE CASCADE,
      tipo varchar(20) NOT NULL CHECK (tipo IN ('identidad','evidencia')), mime varchar(30) NOT NULL,
      contenido bytea NOT NULL, vence timestamptz NOT NULL)`);
    await q.query(
      'CREATE INDEX documentos_prestadores_vencimiento ON documentos_prestadores(vence)',
    );
    await q.query(`CREATE TABLE resenas_servicios (
      id SERIAL PRIMARY KEY, "idTurno" integer NOT NULL UNIQUE REFERENCES turnos_servicios(id_turno),
      puntuacion smallint NOT NULL CHECK (puntuacion BETWEEN 1 AND 5), comentario text NOT NULL,
      fecha timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE reportes_servicios (
      id SERIAL PRIMARY KEY, "idTurno" integer NOT NULL UNIQUE REFERENCES turnos_servicios(id_turno),
      motivo text NOT NULL, estado varchar(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','resuelto')),
      resolucion text, "idAdmin" integer REFERENCES usuarios(id_usuario), "resueltoEn" timestamptz,
      fecha timestamptz NOT NULL DEFAULT now())`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE reportes_servicios');
    await q.query('DROP TABLE resenas_servicios');
    await q.query('DROP TABLE documentos_prestadores');
    await q.query('DROP TABLE solicitudes_prestadores');
  }
}
