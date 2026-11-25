-- CreateTable
CREATE TABLE "SecretSantaEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecretSantaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecretSantaAssignment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "giverId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,

    CONSTRAINT "SecretSantaAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "imageId" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecretSantaEvent_active_idx" ON "SecretSantaEvent"("active");

-- CreateIndex
CREATE UNIQUE INDEX "SecretSantaAssignment_eventId_giverId_key" ON "SecretSantaAssignment"("eventId", "giverId");

-- CreateIndex
CREATE UNIQUE INDEX "SecretSantaAssignment_eventId_receiverId_key" ON "SecretSantaAssignment"("eventId", "receiverId");

-- CreateIndex
CREATE INDEX "WishlistItem_eventId_memberId_idx" ON "WishlistItem"("eventId", "memberId");

-- AddForeignKey
ALTER TABLE "SecretSantaAssignment" ADD CONSTRAINT "SecretSantaAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SecretSantaEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretSantaAssignment" ADD CONSTRAINT "SecretSantaAssignment_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretSantaAssignment" ADD CONSTRAINT "SecretSantaAssignment_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SecretSantaEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

