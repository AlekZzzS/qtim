import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndArticles1700000000000
  implements MigrationInterface
{
  name = 'CreateUsersAndArticles1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR NOT NULL UNIQUE,
        "password" VARCHAR NOT NULL,
        "name" VARCHAR NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "articles" (
        "id" SERIAL PRIMARY KEY,
        "title" VARCHAR NOT NULL,
        "description" TEXT NOT NULL,
        "publishedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "authorId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_articles_author" FOREIGN KEY ("authorId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_articles_publishedAt" ON "articles" ("publishedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_articles_authorId" ON "articles" ("authorId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "articles"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
