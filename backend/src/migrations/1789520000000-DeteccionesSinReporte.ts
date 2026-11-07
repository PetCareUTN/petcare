import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Detecciones preventivas (P1-210): una mascota sin reporte de pérdida que se
 * detecta fuera de la zona de casa de sus dueños también se guarda, para que el
 * dueño vea dónde la detectaron y decida si reportarla.
 *
 * - `id_reporte` pasa a ser opcional: estas detecciones no tienen reporte hasta
 *   que el dueño la reporta (en ese momento se le asocian).
 * - `id_mascota` se agrega para poder buscarlas sin reporte. Las filas que ya
 *   existían lo toman de su reporte.
 * - `tags_ble.avisos_silenciados_hasta` guarda el "Está conmigo" del dueño.
 */
export class DeteccionesSinReporte1789520000000 implements MigrationInterface {
  name = 'DeteccionesSinReporte1789520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "detecciones" ADD COLUMN "id_mascota" integer
    `);
    await queryRunner.query(`
      UPDATE "detecciones" d
      SET "id_mascota" = r."id_mascota"
      FROM "reportes_perdida" r
      WHERE r."id_reporte" = d."id_reporte"
    `);
    await queryRunner.query(`
      ALTER TABLE "detecciones" ALTER COLUMN "id_mascota" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "detecciones" ALTER COLUMN "id_reporte" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "detecciones"
      ADD CONSTRAINT "FK_detecciones_mascota"
      FOREIGN KEY ("id_mascota") REFERENCES "mascotas"("id_mascota")
      ON DELETE CASCADE
    `);
    // La pantalla del aviso preventivo busca la última detección de la mascota.
    await queryRunner.query(`
      CREATE INDEX "IDX_detecciones_mascota_detectado_en" ON "detecciones" ("id_mascota", "detectado_en")
    `);
    await queryRunner.query(`
      ALTER TABLE "tags_ble" ADD COLUMN "avisos_silenciados_hasta" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "tags_ble" DROP COLUMN "avisos_silenciados_hasta"',
    );
    await queryRunner.query(
      'DROP INDEX "IDX_detecciones_mascota_detectado_en"',
    );
    await queryRunner.query(
      'ALTER TABLE "detecciones" DROP CONSTRAINT "FK_detecciones_mascota"',
    );
    // Las preventivas no tienen reporte y no entran en el esquema anterior.
    await queryRunner.query(
      'DELETE FROM "detecciones" WHERE "id_reporte" IS NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "detecciones" ALTER COLUMN "id_reporte" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "detecciones" DROP COLUMN "id_mascota"',
    );
  }
}
