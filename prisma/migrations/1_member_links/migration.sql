-- CreateTable
CREATE TABLE "MemberLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "MemberLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberLink_token_key" ON "MemberLink"("token");

-- CreateIndex
CREATE INDEX "MemberLink_memberId_idx" ON "MemberLink"("memberId");

-- AddForeignKey
ALTER TABLE "MemberLink" ADD CONSTRAINT "MemberLink_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry each member's existing token over as their first link, so links
-- already handed out keep working after this migration.
INSERT INTO "MemberLink" ("id", "token", "label", "createdAt", "memberId")
SELECT gen_random_uuid()::text, "token", '', "createdAt", "id"
FROM "Member";

-- DropIndex
DROP INDEX "Member_token_key";

-- AlterTable
ALTER TABLE "Member" DROP COLUMN "token";
