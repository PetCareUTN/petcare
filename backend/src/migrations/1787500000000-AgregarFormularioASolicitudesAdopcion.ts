import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarFormularioASolicitudesAdopcion1787500000000
  implements MigrationInterface
{
  name = 'AgregarFormularioASolicitudesAdopcion1787500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "solicitudes_adopcion"
      ADD "tipo_vivienda" character varying(20),
      ADD "tiene_patio" boolean,
      ADD "tiene_otras_mascotas" boolean,
      ADD "tiene_ninos" boolean,
      ADD "tuvo_mascotas_antes" boolean,
      ADD "motivo" text,
      ADD "informacion_adicional" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "solicitudes_adopcion"
      DROP COLUMN "informacion_adicional",
      DROP COLUMN "motivo",
      DROP COLUMN "tuvo_mascotas_antes",
      DROP COLUMN "tiene_ninos",
      DROP COLUMN "tiene_otras_mascotas",
      DROP COLUMN "tiene_patio",
      DROP COLUMN "tipo_vivienda"
    `);
  }
}
