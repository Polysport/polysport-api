import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRewardTable1714280599030 implements MigrationInterface {
    name = 'AddRewardTable1714280599030'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "reward" ("id" SERIAL NOT NULL, "cardId" integer NOT NULL, "nftId" integer NOT NULL, "reward" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'processing', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying, CONSTRAINT "PK_a90ea606c229e380fb341838036" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "reward" ADD CONSTRAINT "FK_7b3e48d8a28c1d1422f19c60752" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reward" DROP CONSTRAINT "FK_7b3e48d8a28c1d1422f19c60752"`);
        await queryRunner.query(`DROP TABLE "reward"`);
    }

}
