import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeColType1713956599342 implements MigrationInterface {
    name = 'ChangeColType1713956599342'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "withdraw" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "withdraw" ADD "amount" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "withdraw" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "withdraw" ADD "amount" integer NOT NULL`);
    }

}
