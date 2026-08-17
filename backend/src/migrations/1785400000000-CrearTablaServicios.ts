import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaServicios1785400000000 implements MigrationInterface {
  name = 'CrearTablaServicios1785400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "servicios" ("id_servicio" SERIAL NOT NULL, "id_usuario" integer NOT NULL, "categoria" character varying(20) NOT NULL, "descripcion" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_servicios_id_servicio" PRIMARY KEY ("id_servicio"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "disponibilidades_servicio" ("id_disponibilidad" SERIAL NOT NULL, "id_servicio" integer NOT NULL, "dia_semana" character varying(20) NOT NULL, "hora_inicio" TIME NOT NULL, "hora_fin" TIME NOT NULL, CONSTRAINT "PK_disponibilidades_servicio_id_disponibilidad" PRIMARY KEY ("id_disponibilidad"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "servicios" ADD CONSTRAINT "FK_servicios_usuario" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "disponibilidades_servicio" ADD CONSTRAINT "FK_disponibilidades_servicio_servicio" FOREIGN KEY ("id_servicio") REFERENCES "servicios"("id_servicio") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "disponibilidades_servicio" DROP CONSTRAINT "FK_disponibilidades_servicio_servicio"`,
    );
    await queryRunner.query(
      `ALTER TABLE "servicios" DROP CONSTRAINT "FK_servicios_usuario"`,
    );
    await queryRunner.query(`DROP TABLE "disponibilidades_servicio"`);
    await queryRunner.query(`DROP TABLE "servicios"`);
  }
}
