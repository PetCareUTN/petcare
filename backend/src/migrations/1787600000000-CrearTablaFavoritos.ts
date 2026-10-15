import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaFavoritos1787600000000 implements MigrationInterface {
  name = 'CrearTablaFavoritos1787600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "favoritos" (
        "id_favorito" SERIAL NOT NULL,
        "id_publicacion" integer NOT NULL,
        "id_usuario" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_favoritos_id_favorito" PRIMARY KEY ("id_favorito")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_favoritos_publicacion_usuario"
      ON "favoritos" ("id_publicacion", "id_usuario")
    `);
    await queryRunner.query(`
      ALTER TABLE "favoritos"
      ADD CONSTRAINT "FK_favoritos_publicacion"
      FOREIGN KEY ("id_publicacion") REFERENCES "publicaciones_adopcion"("id_publicacion")
      ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "favoritos"
      ADD CONSTRAINT "FK_favoritos_usuario"
      FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "favoritos" DROP CONSTRAINT "FK_favoritos_usuario"',
    );
    await queryRunner.query(
      'ALTER TABLE "favoritos" DROP CONSTRAINT "FK_favoritos_publicacion"',
    );
    await queryRunner.query('DROP INDEX "UQ_favoritos_publicacion_usuario"');
    await queryRunner.query('DROP TABLE "favoritos"');
  }
}
