import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTxnLog1714282864962 implements MigrationInterface {
    name = 'AddTxnLog1714282864962'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "txn_log" ("id" SERIAL NOT NULL, "txHash" character varying NOT NULL, "event" character varying NOT NULL, CONSTRAINT "PK_a8af548a8904507e77f36a79c8d" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "txn_log"`);
    }

}
