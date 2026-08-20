import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaAuditoriaUsuarios1786000000000
  implements MigrationInterface
{
  name = 'CrearTablaAuditoriaUsuarios1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "auditoria_usuarios" ("id_auditoria" SERIAL NOT NULL, "id_usuario" integer NOT NULL, "tipo_accion" character varying(50) NOT NULL, "detalle" jsonb, "fecha_accion" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_auditoria_usuarios_id_auditoria" PRIMARY KEY ("id_auditoria"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_auditoria_usuarios_usuario" ON "auditoria_usuarios" ("id_usuario")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_auditoria_usuarios_usuario"`,
    );
    await queryRunner.query(`DROP TABLE "auditoria_usuarios"`);
  }
}
