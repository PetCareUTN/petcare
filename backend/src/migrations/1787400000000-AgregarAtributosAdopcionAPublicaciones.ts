import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarAtributosAdopcionAPublicaciones1787400000000
  implements MigrationInterface
{
  name = 'AgregarAtributosAdopcionAPublicaciones1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "publicaciones_adopcion"
      ADD "tamano" character varying(20),
      ADD "vacunado" boolean NOT NULL DEFAULT false,
      ADD "compatible_perros" boolean NOT NULL DEFAULT false,
      ADD "compatible_gatos" boolean NOT NULL DEFAULT false,
      ADD "compatible_ninos" boolean NOT NULL DEFAULT false,
      ADD "necesita_patio" boolean NOT NULL DEFAULT false,
      ADD "ubicacion" character varying(150)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "publicaciones_adopcion"
      DROP COLUMN "ubicacion",
      DROP COLUMN "necesita_patio",
      DROP COLUMN "compatible_ninos",
      DROP COLUMN "compatible_gatos",
      DROP COLUMN "compatible_perros",
      DROP COLUMN "vacunado",
      DROP COLUMN "tamano"
    `);
  }
}
