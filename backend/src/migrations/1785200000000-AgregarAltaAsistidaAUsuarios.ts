import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarAltaAsistidaAUsuarios1785200000000
  implements MigrationInterface
{
  name = 'AgregarAltaAsistidaAUsuarios1785200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD COLUMN "id_veterinario_alta_asistida" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD CONSTRAINT "FK_usuarios_veterinario_alta_asistida"
      FOREIGN KEY ("id_veterinario_alta_asistida")
      REFERENCES "veterinarios"("id_veterinario")
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      DROP CONSTRAINT "FK_usuarios_veterinario_alta_asistida"
    `);

    await queryRunner.query(`
      ALTER TABLE "usuarios"
      DROP COLUMN "id_veterinario_alta_asistida"
    `);
  }
}
