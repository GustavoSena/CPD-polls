-- AlterTable
ALTER TABLE "SecretSantaEvent" ADD COLUMN     "drawnAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SecretSantaParticipant" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "SecretSantaParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SecretSantaParticipant_eventId_memberId_key" ON "SecretSantaParticipant"("eventId", "memberId");

-- AddForeignKey
ALTER TABLE "SecretSantaParticipant" ADD CONSTRAINT "SecretSantaParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SecretSantaEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretSantaParticipant" ADD CONSTRAINT "SecretSantaParticipant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: events created before this migration were drawn on creation,
-- and everyone in a drawn pair took part.
UPDATE "SecretSantaEvent" e SET "drawnAt" = e."createdAt"
WHERE EXISTS (SELECT 1 FROM "SecretSantaAssignment" a WHERE a."eventId" = e."id");

INSERT INTO "SecretSantaParticipant" ("id", "eventId", "memberId")
SELECT 'ssp_' || md5(a."eventId" || ':' || a."giverId"), a."eventId", a."giverId"
FROM "SecretSantaAssignment" a
ON CONFLICT DO NOTHING;
