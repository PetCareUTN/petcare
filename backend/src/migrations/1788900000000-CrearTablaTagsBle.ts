import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaTagsBle1788900000000 implements MigrationInterface {
  name = 'CrearTablaTagsBle1788900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tags_ble" (
        "id_tag_ble" SERIAL NOT NULL,
        "tag_id" character varying(12) NOT NULL,
        "id_mascota" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tags_ble_id_tag_ble" PRIMARY KEY ("id_tag_ble")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_tags_ble_tag_id" ON "tags_ble" ("tag_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_tags_ble_mascota" ON "tags_ble" ("id_mascota")
    `);
    await queryRunner.query(`
      ALTER TABLE "tags_ble"
      ADD CONSTRAINT "FK_tags_ble_mascota"
      FOREIGN KEY ("id_mascota") REFERENCES "mascotas"("id_mascota")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "tags_ble" DROP CONSTRAINT "FK_tags_ble_mascota"',
    );
    await queryRunner.query('DROP INDEX "UQ_tags_ble_mascota"');
    await queryRunner.query('DROP INDEX "UQ_tags_ble_tag_id"');
    await queryRunner.query('DROP TABLE "tags_ble"');
  }
}
