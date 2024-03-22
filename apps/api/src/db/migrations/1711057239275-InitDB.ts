import { MigrationInterface, QueryRunner } from "typeorm";

export class InitDB1711057239275 implements MigrationInterface {
    name = 'InitDB1711057239275'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "chain" ("id" character varying NOT NULL, "blockNumber" integer NOT NULL, CONSTRAINT "PK_8e273aafae283b886672c952ecd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "nft" ("id" character varying NOT NULL, "owner" character varying NOT NULL, "description" character varying NOT NULL, "name" character varying NOT NULL, "attributes" character varying NOT NULL, "image" character varying NOT NULL, "uri" character varying NOT NULL, CONSTRAINT "PK_8f46897c58e23b0e7bf6c8e56b0" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "nft"`);
        await queryRunner.query(`DROP TABLE "chain"`);
    }

}
