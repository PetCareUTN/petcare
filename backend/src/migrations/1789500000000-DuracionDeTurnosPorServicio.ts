import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cada servicio define cuánto dura su turno. Antes la duración salía de la
 * categoría (guardería 60 minutos, el resto 30), así que los servicios ya
 * cargados conservan ese mismo valor.
 */
export class DuracionDeTurnosPorServicio1789500000000
  implements MigrationInterface
{
  name = 'DuracionDeTurnosPorServicio1789500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "servicios" ADD COLUMN "duracion_minutos" integer`,
    );
    await queryRunner.query(`
      UPDATE "servicios"
      SET "duracion_minutos" = CASE WHEN "categoria" = 'guarderia' THEN 60 ELSE 30 END
    `);
    await queryRunner.query(
      `ALTER TABLE "servicios" ALTER COLUMN "duracion_minutos" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "servicios" DROP COLUMN "duracion_minutos"`,
    );
  }
}
