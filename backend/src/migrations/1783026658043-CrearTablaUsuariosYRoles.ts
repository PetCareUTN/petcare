import { MigrationInterface, QueryRunner } from "typeorm";

export class CrearTablaUsuariosYRoles1783026658043 implements MigrationInterface {
    name = 'CrearTablaUsuariosYRoles1783026658043'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "roles" ("id_rol" SERIAL NOT NULL, "nombre" character varying(50) NOT NULL, CONSTRAINT "UQ_a5be7aa67e759e347b1c6464e10" UNIQUE ("nombre"), CONSTRAINT "PK_25f8d4161f00a1dd1cbe5068695" PRIMARY KEY ("id_rol"))`);
        await queryRunner.query(`CREATE TABLE "usuarios" ("id_usuario" SERIAL NOT NULL, "nombre" character varying(100) NOT NULL, "apellido" character varying(100) NOT NULL, "email" character varying(150) NOT NULL, "telefono" character varying(30), "password" character varying(255) NOT NULL, "fecha_registro" TIMESTAMP NOT NULL DEFAULT now(), "estado" character varying(20) NOT NULL DEFAULT 'activo', "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "id_rol" integer NOT NULL, CONSTRAINT "UQ_446adfc18b35418aac32ae0b7b5" UNIQUE ("email"), CONSTRAINT "PK_dfe59db369749f9042499fd8107" PRIMARY KEY ("id_usuario"))`);
        await queryRunner.query(`ALTER TABLE "usuarios" ADD CONSTRAINT "FK_98bf89ebf4b0be2d3825f54e56c" FOREIGN KEY ("id_rol") REFERENCES "roles"("id_rol") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "usuarios" DROP CONSTRAINT "FK_98bf89ebf4b0be2d3825f54e56c"`);
        await queryRunner.query(`DROP TABLE "usuarios"`);
        await queryRunner.query(`DROP TABLE "roles"`);
    }

}
