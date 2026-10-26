import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarTipoReferenciaANotificaciones1789480000000 implements MigrationInterface {
  name = 'AgregarTipoReferenciaANotificaciones1789480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Los turnos veterinarios y los de servicios viven en tablas distintas y
    // sus ids se pisan, así que `id_referencia` solo no alcanza para abrir el
    // turno correcto. Nullable: las notificaciones que ya existen, y los tipos
    // cuyo `tipo` ya alcanza para saber a qué apuntan, no la usan.
    await queryRunner.query(
      `ALTER TABLE "notificaciones" ADD "tipo_referencia" character varying(30)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notificaciones" DROP COLUMN "tipo_referencia"`,
    );
  }
}
