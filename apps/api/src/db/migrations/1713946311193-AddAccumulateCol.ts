import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAccumulateCol1713946311193 implements MigrationInterface {
    name = 'AddAccumulateCol1713946311193'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "card" ADD "userFlipped" boolean`);
        await queryRunner.query(`ALTER TABLE "user" ADD "accMinted" character varying NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "user" ADD "accRewarded" character varying NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "accRewarded"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "accMinted"`);
        await queryRunner.query(`ALTER TABLE "card" DROP COLUMN "userFlipped"`);
    }

}
