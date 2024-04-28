import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAccType1714284351110 implements MigrationInterface {
    name = 'UpdateAccType1714284351110'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "accMinted"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "accMinted" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "accMinted"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "accMinted" character varying NOT NULL DEFAULT '0'`);
    }

}
