import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBlogs1791620100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blog_status_enum') THEN
          CREATE TYPE "blog_status_enum" AS ENUM ('draft', 'published');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "blogs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slug" character varying NOT NULL,
        "title" character varying NOT NULL,
        "excerpt" text,
        "content" text NOT NULL,
        "coverImageUrl" character varying,
        "status" "blog_status_enum" NOT NULL DEFAULT 'draft',
        "publishedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blogs_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_blogs_slug" UNIQUE ("slug")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_blogs_status_publishedAt"
      ON "blogs" ("status", "publishedAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_blogs_status_publishedAt"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "blogs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "blog_status_enum"`);
  }
}
