import { MigrationInterface, QueryRunner } from "typeorm";

export class InitDB1711457017552 implements MigrationInterface {
    name = 'InitDB1711457017552'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "chain" ("id" character varying NOT NULL, "blockNumber" integer NOT NULL, CONSTRAINT "PK_8e273aafae283b886672c952ecd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "card" ("id" SERIAL NOT NULL, "cardId" integer NOT NULL, "flipped" boolean NOT NULL, "nftId" integer NOT NULL, "reward" character varying NOT NULL, "userId" character varying, CONSTRAINT "PK_9451069b6f1199730791a7f4ae4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" character varying NOT NULL, "numOfFlip" integer NOT NULL, "rewarded" character varying NOT NULL, "burnedNftId" integer, CONSTRAINT "REL_ac97b0f147d8f452c987f9d99e" UNIQUE ("burnedNftId"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "nft" ("id" integer NOT NULL, "nftId" integer NOT NULL, "description" character varying NOT NULL, "name" character varying NOT NULL, "attributes" character varying NOT NULL, "image" character varying NOT NULL, "uri" character varying NOT NULL, "ownerId" character varying, CONSTRAINT "PK_8f46897c58e23b0e7bf6c8e56b0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "card" ADD CONSTRAINT "FK_77d7cc9d95dccd574d71ba221b0" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_ac97b0f147d8f452c987f9d99ee" FOREIGN KEY ("burnedNftId") REFERENCES "nft"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "nft" ADD CONSTRAINT "owner" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "nft" DROP CONSTRAINT "owner"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_ac97b0f147d8f452c987f9d99ee"`);
        await queryRunner.query(`ALTER TABLE "card" DROP CONSTRAINT "FK_77d7cc9d95dccd574d71ba221b0"`);
        await queryRunner.query(`DROP TABLE "nft"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "card"`);
        await queryRunner.query(`DROP TABLE "chain"`);
    }

}
