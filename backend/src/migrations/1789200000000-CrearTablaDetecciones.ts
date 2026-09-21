import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaDetecciones1789200000000 implements MigrationInterface {
  name = 'CrearTablaDetecciones1789200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "detecciones" (
        "id_deteccion" SERIAL NOT NULL,
        "deteccion_uuid" uuid NOT NULL,
        "id_reporte" integer NOT NULL,
        "tag_id" character varying(12) NOT NULL,
        "rssi" integer NOT NULL,
        "latitud" double precision NOT NULL,
        "longitud" double precision NOT NULL,
        "precision_metros" integer NOT NULL,
        "detectado_en" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_detecciones_id_deteccion" PRIMARY KEY ("id_deteccion")
      )
    `);
    // Deduplica los reintentos del celular (ver DeteccionesService).
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_detecciones_deteccion_uuid" ON "detecciones" ("deteccion_uuid")
    `);
    // US-37 busca la última detección de un reporte.
    await queryRunner.query(`
      CREATE INDEX "IDX_detecciones_reporte_detectado_en" ON "detecciones" ("id_reporte", "detectado_en")
    `);
    await queryRunner.query(`
      ALTER TABLE "detecciones"
      ADD CONSTRAINT "FK_detecciones_reporte"
      FOREIGN KEY ("id_reporte") REFERENCES "reportes_perdida"("id_reporte")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "detecciones" DROP CONSTRAINT "FK_detecciones_reporte"',
    );
    await queryRunner.query(
      'DROP INDEX "IDX_detecciones_reporte_detectado_en"',
    );
    await queryRunner.query('DROP INDEX "UQ_detecciones_deteccion_uuid"');
    await queryRunner.query('DROP TABLE "detecciones"');
  }
}
