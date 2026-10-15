import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarGeolocalizacionAUsuariosYPrestadores1788700000000
  implements MigrationInterface
{
  name = 'AgregarGeolocalizacionAUsuariosYPrestadores1788700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Veterinarios: la dirección ya vive en usuarios.direccion.
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD "latitud" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD "longitud" double precision`,
    );

    // Dueños de mascota que ofrecen servicios: la dirección vive en
    // solicitudes_prestadores.datos (jsonb), una por usuario + categoría.
    await queryRunner.query(
      `ALTER TABLE "solicitudes_prestadores" ADD "latitud" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "solicitudes_prestadores" ADD "longitud" double precision`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "solicitudes_prestadores" DROP COLUMN "longitud"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solicitudes_prestadores" DROP COLUMN "latitud"`,
    );
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "longitud"`);
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "latitud"`);
  }
}
