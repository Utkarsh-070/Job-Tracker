-- Preserve existing user IDs and applications while retiring access-key authentication.
ALTER TABLE "User" ALTER COLUMN "key" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "firebaseUid" TEXT;
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "displayName" TEXT;
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");
