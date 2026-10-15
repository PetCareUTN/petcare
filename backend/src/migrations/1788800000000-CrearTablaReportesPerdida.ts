import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaReportesPerdida1788800000000 implements MigrationInterface {
  name = 'CrearTablaReportesPerdida1788800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reportes_perdida" (
        "id_reporte" SERIAL NOT NULL,
        "id_mascota" integer NOT NULL,
        "id_usuario" integer NOT NULL,
        "estado" character varying(20) NOT NULL DEFAULT 'activo',
        "fecha_perdida" TIMESTAMP NOT NULL,
        "latitud" double precision NOT NULL,
        "longitud" double precision NOT NULL,
        "descripcion" text,
        "contacto" character varying(150),
        "fecha_cierre" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reportes_perdida_id_reporte" PRIMARY KEY ("id_reporte")
      )
    `);
    // Una mascota no puede estar reportada como perdida dos veces a la vez,
    // pero sí puede perderse de nuevo después de que se cierre el reporte.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_reportes_perdida_mascota_activo"
      ON "reportes_perdida" ("id_mascota")
      WHERE "estado" = 'activo'
    `);
    await queryRunner.query(`
      ALTER TABLE "reportes_perdida"
      ADD CONSTRAINT "FK_reportes_perdida_mascota"
      FOREIGN KEY ("id_mascota") REFERENCES "mascotas"("id_mascota")
      ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "reportes_perdida"
      ADD CONSTRAINT "FK_reportes_perdida_usuario"
      FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "reportes_perdida" DROP CONSTRAINT "FK_reportes_perdida_usuario"',
    );
    await queryRunner.query(
      'ALTER TABLE "reportes_perdida" DROP CONSTRAINT "FK_reportes_perdida_mascota"',
    );
    await queryRunner.query('DROP INDEX "UQ_reportes_perdida_mascota_activo"');
    await queryRunner.query('DROP TABLE "reportes_perdida"');
  }
}
