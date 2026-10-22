import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudentAmbassadors1791475200000
  implements MigrationInterface
{
  name = 'CreateStudentAmbassadors1791475200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "student_ambassadors" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "fullName" character varying NOT NULL,
        "email" character varying NOT NULL,
        "phone" character varying NOT NULL,
        "state" character varying NOT NULL,
        "institution" character varying NOT NULL,
        "courseDepartment" character varying NOT NULL,
        "level" character varying NOT NULL,
        "socialMediaHandles" jsonb NOT NULL,
        "promotionPlan" text NOT NULL,
        "studentMatricNo" character varying NOT NULL,
        "idCardUrl" text NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_student_ambassadors_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_student_ambassadors_email" UNIQUE ("email"),
        CONSTRAINT "UQ_student_ambassadors_matric" UNIQUE ("studentMatricNo")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "student_ambassadors"');
  }
}
