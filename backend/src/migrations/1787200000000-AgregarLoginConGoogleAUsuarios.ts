import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarLoginConGoogleAUsuarios1787200000000
  implements MigrationInterface
{
  name = 'AgregarLoginConGoogleAUsuarios1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Las cuentas creadas con Google no tienen contraseña propia.
    await queryRunner.query(
      `ALTER TABLE "usuarios" ALTER COLUMN "password" DROP NOT NULL`,
    );

    // Identificador estable de Google ("sub" del token): no cambia aunque la
    // persona cambie el email de su cuenta.
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD "google_id" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD CONSTRAINT "UQ_usuarios_google_id" UNIQUE ("google_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP CONSTRAINT "UQ_usuarios_google_id"`,
    );
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "google_id"`);

    /*
     * Para poder volver a NOT NULL hay que darle una contraseña a las cuentas
     * que entraron con Google. Se les pone un hash imposible de acertar: quedan
     * sin acceso por contraseña, que es justamente lo que eran antes.
     */
    await queryRunner.query(
      `UPDATE "usuarios" SET "password" = '!' WHERE "password" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ALTER COLUMN "password" SET NOT NULL`,
    );
  }
}
