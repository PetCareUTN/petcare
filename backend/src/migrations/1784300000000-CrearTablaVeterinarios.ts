import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaVeterinarios1784300000000
  implements MigrationInterface
{
  name = 'CrearTablaVeterinarios1784300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "validation_status_enum" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "veterinarios" (
        "id_veterinario" SERIAL NOT NULL,
        "id_usuario" integer NOT NULL,
        "numero_documento" character varying(30) NOT NULL,
        "numero_matricula" character varying(50) NOT NULL,
        "provincia_matricula" character varying(100) NOT NULL,
        "matricula_url" text NOT NULL,
        "estado_validacion" character varying(20) NOT NULL DEFAULT 'PENDIENTE',
        "motivo_rechazo" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_veterinarios_id_veterinario" PRIMARY KEY ("id_veterinario"),
        CONSTRAINT "UQ_veterinarios_id_usuario" UNIQUE ("id_usuario")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "veterinarios" ADD CONSTRAINT "FK_veterinarios_usuario" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "veterinarios" DROP CONSTRAINT "FK_veterinarios_usuario"`,
    );
    await queryRunner.query(`DROP TABLE "veterinarios"`);
    await queryRunner.query(`DROP TYPE "validation_status_enum"`);
  }
}
