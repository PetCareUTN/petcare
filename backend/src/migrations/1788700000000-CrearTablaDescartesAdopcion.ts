import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaDescartesAdopcion1788700000000
  implements MigrationInterface
{
  name = 'CrearTablaDescartesAdopcion1788700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "descartes_adopcion" (
        "id_descarte" SERIAL NOT NULL,
        "id_publicacion" integer NOT NULL,
        "id_usuario" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_descartes_adopcion_id_descarte" PRIMARY KEY ("id_descarte")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_descartes_adopcion_publicacion_usuario"
      ON "descartes_adopcion" ("id_publicacion", "id_usuario")
    `);
    await queryRunner.query(`
      ALTER TABLE "descartes_adopcion"
      ADD CONSTRAINT "FK_descartes_adopcion_publicacion"
      FOREIGN KEY ("id_publicacion") REFERENCES "publicaciones_adopcion"("id_publicacion")
      ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "descartes_adopcion"
      ADD CONSTRAINT "FK_descartes_adopcion_usuario"
      FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "descartes_adopcion" DROP CONSTRAINT "FK_descartes_adopcion_usuario"',
    );
    await queryRunner.query(
      'ALTER TABLE "descartes_adopcion" DROP CONSTRAINT "FK_descartes_adopcion_publicacion"',
    );
    await queryRunner.query(
      'DROP INDEX "UQ_descartes_adopcion_publicacion_usuario"',
    );
    await queryRunner.query('DROP TABLE "descartes_adopcion"');
  }
}
