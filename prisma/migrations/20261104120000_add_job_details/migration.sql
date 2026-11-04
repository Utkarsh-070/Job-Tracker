-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('INTERN', 'FULL_TIME');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN "jobType" "JobType" NOT NULL DEFAULT 'FULL_TIME';
ALTER TABLE "Application" ADD COLUMN "source" TEXT;
ALTER TABLE "Application" ADD COLUMN "location" TEXT;
