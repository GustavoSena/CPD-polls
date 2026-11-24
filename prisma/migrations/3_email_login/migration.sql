-- AlterTable: members sign in with an email code. Nullable so existing
-- members (and the links already handed out) keep working unchanged.
ALTER TABLE "Member" ADD COLUMN "email" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");

-- CreateTable
CREATE TABLE "LoginCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "LoginCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginCode_memberId_idx" ON "LoginCode"("memberId");

-- AddForeignKey
ALTER TABLE "LoginCode" ADD CONSTRAINT "LoginCode_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: tell devices from email sign-in apart from admin links.
ALTER TABLE "MemberLink" ADD COLUMN "fromLogin" BOOLEAN NOT NULL DEFAULT false;
