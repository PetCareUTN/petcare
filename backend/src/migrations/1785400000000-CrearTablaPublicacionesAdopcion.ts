import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaPublicacionesAdopcion1785400000000
  implements MigrationInterface
{
  name = 'CrearTablaPublicacionesAdopcion1785400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "publicaciones_adopcion" (
        "id_publicacion" SERIAL NOT NULL,
        "id_mascota" integer NOT NULL,
        "id_usuario" integer NOT NULL,
        "descripcion" text NOT NULL,
        "estado" character varying(20) NOT NULL DEFAULT 'ACTIVA',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_publicaciones_adopcion_id_publicacion" PRIMARY KEY ("id_publicacion")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_publicaciones_adopcion_mascota" ON "publicaciones_adopcion" ("id_mascota")`,
    );
    // Solo puede haber una publicación ACTIVA por mascota.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_publicaciones_adopcion_mascota_activa" ON "publicaciones_adopcion" ("id_mascota") WHERE "estado" = 'ACTIVA'`,
    );
    await queryRunner.query(
      `ALTER TABLE "publicaciones_adopcion" ADD CONSTRAINT "FK_publicaciones_adopcion_mascota" FOREIGN KEY ("id_mascota") REFERENCES "mascotas"("id_mascota") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "publicaciones_adopcion" ADD CONSTRAINT "FK_publicaciones_adopcion_usuario" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "publicaciones_adopcion" DROP CONSTRAINT "FK_publicaciones_adopcion_usuario"`,
    );
    await queryRunner.query(
      `ALTER TABLE "publicaciones_adopcion" DROP CONSTRAINT "FK_publicaciones_adopcion_mascota"`,
    );
    await queryRunner.query(
      `DROP INDEX "UQ_publicaciones_adopcion_mascota_activa"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_publicaciones_adopcion_mascota"`);
    await queryRunner.query(`DROP TABLE "publicaciones_adopcion"`);
  }
}
