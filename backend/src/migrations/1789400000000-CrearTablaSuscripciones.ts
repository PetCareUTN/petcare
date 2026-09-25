import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaSuscripciones1789400000000 implements MigrationInterface {
  name = 'CrearTablaSuscripciones1789400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "suscripciones" (
        "id_suscripcion" SERIAL NOT NULL,
        "id_usuario" integer NOT NULL,
        "estado" character varying(20) NOT NULL DEFAULT 'PENDIENTE_PAGO',
        "monto" numeric(10,2) NOT NULL DEFAULT 1000,
        "moneda" character varying(3) NOT NULL DEFAULT 'ARS',
        "mp_preapproval_id" character varying,
        "fecha_inicio" timestamptz,
        "fecha_fin" timestamptz,
        "fecha_gracia_inicio" timestamptz,
        "fecha_vencimiento" timestamptz,
        "gracia_notificada" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_suscripciones_id_suscripcion" PRIMARY KEY ("id_suscripcion")
      )
    `);
    // 1:1 con usuario: un solo registro de suscripción por cuenta.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_suscripciones_id_usuario" ON "suscripciones" ("id_usuario")`,
    );
    await queryRunner.query(`
      ALTER TABLE "suscripciones"
      ADD CONSTRAINT "FK_suscripciones_usuario"
      FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "suscripciones" DROP CONSTRAINT "FK_suscripciones_usuario"`,
    );
    await queryRunner.query(`DROP INDEX "UQ_suscripciones_id_usuario"`);
    await queryRunner.query(`DROP TABLE "suscripciones"`);
  }
}
