-- CreateEnum
CREATE TYPE "TranscriptSource" AS ENUM ('CAPTIONS');

-- CreateTable
CREATE TABLE "CaptionEvent" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "rawText" TEXT NOT NULL,
    "speakerLabel" TEXT,
    "isPartial" BOOLEAN NOT NULL DEFAULT true,
    "source" "TranscriptSource" NOT NULL DEFAULT 'CAPTIONS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaptionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaptionEvent_meetingId_idx" ON "CaptionEvent"("meetingId");

-- CreateIndex
CREATE INDEX "CaptionEvent_meetingId_sequenceNumber_idx" ON "CaptionEvent"("meetingId", "sequenceNumber");

-- AddForeignKey
ALTER TABLE "CaptionEvent" ADD CONSTRAINT "CaptionEvent_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
