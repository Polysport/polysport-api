import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTxnLogIndex1714282958682 implements MigrationInterface {
    name = 'AddTxnLogIndex1714282958682'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "txn_log" ADD "logIndex" integer NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "txn_log" DROP COLUMN "logIndex"`);
    }

}
