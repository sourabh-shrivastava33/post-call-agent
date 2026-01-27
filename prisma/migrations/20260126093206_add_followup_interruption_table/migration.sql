/*
  Warnings:

  - You are about to drop the `RunState` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[interruption_id]` on the table `EmailDraft` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "EmailFollowUpStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- DropTable
DROP TABLE "RunState";

-- CreateTable
CREATE TABLE "EmailFollowUpInterruption" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "to" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "EmailFollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailFollowUpInterruption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailFollowUpInterruption_meetingId_idx" ON "EmailFollowUpInterruption"("meetingId");

-- CreateIndex
CREATE INDEX "EmailFollowUpInterruption_status_idx" ON "EmailFollowUpInterruption"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EmailDraft_interruption_id_key" ON "EmailDraft"("interruption_id");

-- CreateIndex
CREATE INDEX "EmailDraft_meetingId_idx" ON "EmailDraft"("meetingId");

-- AddForeignKey
ALTER TABLE "EmailFollowUpInterruption" ADD CONSTRAINT "EmailFollowUpInterruption_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDraft" ADD CONSTRAINT "EmailDraft_interruption_id_fkey" FOREIGN KEY ("interruption_id") REFERENCES "EmailFollowUpInterruption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDraft" ADD CONSTRAINT "EmailDraft_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
