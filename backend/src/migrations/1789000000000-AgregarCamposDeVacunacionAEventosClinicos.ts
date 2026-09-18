import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarCamposDeVacunacionAEventosClinicos1789000000000
  implements MigrationInterface
{
  name = 'AgregarCamposDeVacunacionAEventosClinicos1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Las tres columnas son nullable porque solo aplican a los eventos de tipo
    // 'vacuna'. Los eventos ya cargados quedan en null y simplemente no generan
    // recordatorio, así que no hace falta migrar datos existentes.
    await queryRunner.query(
      `ALTER TABLE "eventos_clinicos" ADD "vacuna" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "eventos_clinicos" ADD "proxima_aplicacion" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "eventos_clinicos" ADD "recordatorio_enviado_at" TIMESTAMP`,
    );

    // La tarea diaria busca siempre por el mismo criterio: eventos de vacunación
    // con próxima aplicación cercana a los que todavía no se avisó. El índice
    // parcial cubre exactamente esa consulta y deja afuera el resto de la tabla,
    // que es la enorme mayoría de los eventos clínicos.
    await queryRunner.query(`
      CREATE INDEX "IDX_eventos_clinicos_proxima_aplicacion"
      ON "eventos_clinicos" ("proxima_aplicacion")
      WHERE "proxima_aplicacion" IS NOT NULL
        AND "recordatorio_enviado_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "IDX_eventos_clinicos_proxima_aplicacion"',
    );
    await queryRunner.query(
      `ALTER TABLE "eventos_clinicos" DROP COLUMN "recordatorio_enviado_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "eventos_clinicos" DROP COLUMN "proxima_aplicacion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "eventos_clinicos" DROP COLUMN "vacuna"`,
    );
  }
}
