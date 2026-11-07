import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Zona de casa del dueño (P1-209): centro y radio dentro del cual se considera
 * que la mascota está en casa y no se guarda ni se avisa su ubicación.
 *
 * Columnas aparte de `latitud`/`longitud`, que son la ubicación geocodificada de
 * la veterinaria y tienen otro significado.
 */
export class AgregarZonaDeCasaAUsuarios1789510000000 implements MigrationInterface {
  name = 'AgregarZonaDeCasaAUsuarios1789510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
        ADD COLUMN "casa_latitud" double precision,
        ADD COLUMN "casa_longitud" double precision,
        ADD COLUMN "casa_radio_metros" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
        DROP COLUMN "casa_radio_metros",
        DROP COLUMN "casa_longitud",
        DROP COLUMN "casa_latitud"
    `);
  }
}
