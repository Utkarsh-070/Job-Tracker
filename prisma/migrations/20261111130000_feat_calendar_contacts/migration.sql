-- CreateEnum
CREATE TYPE "ContactRole" AS ENUM ('RECRUITER', 'HIRING_MANAGER', 'REFERRER', 'OTHER');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN "interviewDate" TIMESTAMP(3);
ALTER TABLE "Application" ADD COLUMN "interviewers"  TEXT;
ALTER TABLE "Application" ADD COLUMN "meetingUrl"    TEXT;

-- CreateTable
CREATE TABLE "Contact" (
    "id"              TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "role"            "ContactRole" NOT NULL DEFAULT 'OTHER',
    "email"           TEXT,
    "linkedinUrl"     TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    "applicationId"   TEXT NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "Application"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

