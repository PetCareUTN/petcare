import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaPagosSuscripcion1789410000000 implements MigrationInterface {
  name = 'CrearTablaPagosSuscripcion1789410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "pagos_suscripcion" (
        "id_pago" SERIAL NOT NULL,
        "id_suscripcion" integer NOT NULL,
        "monto" numeric(10,2) NOT NULL,
        "moneda" character varying(3) NOT NULL,
        "estado" character varying(20) NOT NULL,
        "mp_payment_id" character varying,
        "mp_status" character varying,
        "fecha_pago" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pagos_suscripcion_id_pago" PRIMARY KEY ("id_pago")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_pagos_suscripcion_id_suscripcion" ON "pagos_suscripcion" ("id_suscripcion")`,
    );
    // Idempotencia del webhook: no procesar dos veces el mismo pago de MP.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_pagos_suscripcion_mp_payment_id" ON "pagos_suscripcion" ("mp_payment_id") WHERE "mp_payment_id" IS NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "pagos_suscripcion"
      ADD CONSTRAINT "FK_pagos_suscripcion_suscripcion"
      FOREIGN KEY ("id_suscripcion") REFERENCES "suscripciones"("id_suscripcion")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pagos_suscripcion" DROP CONSTRAINT "FK_pagos_suscripcion_suscripcion"`,
    );
    await queryRunner.query(`DROP INDEX "UQ_pagos_suscripcion_mp_payment_id"`);
    await queryRunner.query(
      `DROP INDEX "IDX_pagos_suscripcion_id_suscripcion"`,
    );
    await queryRunner.query(`DROP TABLE "pagos_suscripcion"`);
  }
}
