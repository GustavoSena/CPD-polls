-- CreateTable
CREATE TABLE "SecretSantaExclusion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" TEXT NOT NULL,
    "aId" TEXT NOT NULL,
    "bId" TEXT NOT NULL,

    CONSTRAINT "SecretSantaExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SecretSantaExclusion_eventId_aId_bId_key" ON "SecretSantaExclusion"("eventId", "aId", "bId");

-- AddForeignKey
ALTER TABLE "SecretSantaExclusion" ADD CONSTRAINT "SecretSantaExclusion_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SecretSantaEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretSantaExclusion" ADD CONSTRAINT "SecretSantaExclusion_aId_fkey" FOREIGN KEY ("aId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretSantaExclusion" ADD CONSTRAINT "SecretSantaExclusion_bId_fkey" FOREIGN KEY ("bId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
