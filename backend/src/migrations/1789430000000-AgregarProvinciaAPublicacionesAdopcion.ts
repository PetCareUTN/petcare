import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarProvinciaAPublicacionesAdopcion1789430000000
  implements MigrationInterface
{
  name = 'AgregarProvinciaAPublicacionesAdopcion1789430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "publicaciones_adopcion"
      ADD COLUMN "provincia" character varying(50)
    `);

    // Las publicaciones que ya existen se completan con la provincia del
    // dueño, cuando la tiene cargada. Las que queden en NULL no aparecen al
    // filtrar por provincia: preferimos no mostrarlas antes que inventarles
    // una ubicación. Quien publicó puede corregirlo volviendo a publicar.
    await queryRunner.query(`
      UPDATE "publicaciones_adopcion" p
      SET "provincia" = u."provincia"
      FROM "usuarios" u
      WHERE u."id_usuario" = p."id_usuario"
        AND u."provincia" IS NOT NULL
    `);

    // El filtro del listado de adopciones consulta por provincia junto con el
    // estado de la publicación.
    await queryRunner.query(`
      CREATE INDEX "IDX_publicaciones_adopcion_provincia"
      ON "publicaciones_adopcion" ("provincia", "estado")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_publicaciones_adopcion_provincia"
    `);
    await queryRunner.query(`
      ALTER TABLE "publicaciones_adopcion" DROP COLUMN "provincia"
    `);
  }
}
