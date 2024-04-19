import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWithdraw1713510498409 implements MigrationInterface {
    name = 'AddWithdraw1713510498409'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "withdraw" ("id" SERIAL NOT NULL, "withdrawId" integer NOT NULL, "amount" integer NOT NULL, "orderType" integer NOT NULL, "claimTime" integer NOT NULL, "claimed" boolean NOT NULL DEFAULT false, "ownerId" character varying, CONSTRAINT "PK_5c172f81689173f75bf5906ef22" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "withdraw" ADD CONSTRAINT "FK_071fb5d7aaa936f887bf831c57a" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "withdraw" DROP CONSTRAINT "FK_071fb5d7aaa936f887bf831c57a"`);
        await queryRunner.query(`DROP TABLE "withdraw"`);
    }

}
