import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaMascotas1784210000000 implements MigrationInterface {
  name = 'CrearTablaMascotas1784210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "mascotas" ("id_mascota" SERIAL NOT NULL, "nombre" character varying(100) NOT NULL, "id_historia" integer, "especie" character varying(50) NOT NULL, "raza" character varying(80), "sexo" character varying(20) NOT NULL, "fecha_nacimiento" date, "peso" numeric(6,2), "esterilizado" boolean NOT NULL DEFAULT false, "foto" text, "observaciones" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_mascotas_id_mascota" PRIMARY KEY ("id_mascota"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "usuarios_mascotas" ("id_usuario" integer NOT NULL, "id_mascota" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_usuarios_mascotas" PRIMARY KEY ("id_usuario", "id_mascota"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios_mascotas" ADD CONSTRAINT "FK_usuarios_mascotas_usuario" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios_mascotas" ADD CONSTRAINT "FK_usuarios_mascotas_mascota" FOREIGN KEY ("id_mascota") REFERENCES "mascotas"("id_mascota") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios_mascotas" DROP CONSTRAINT "FK_usuarios_mascotas_mascota"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios_mascotas" DROP CONSTRAINT "FK_usuarios_mascotas_usuario"`,
    );
    await queryRunner.query(`DROP TABLE "usuarios_mascotas"`);
    await queryRunner.query(`DROP TABLE "mascotas"`);
  }
}
