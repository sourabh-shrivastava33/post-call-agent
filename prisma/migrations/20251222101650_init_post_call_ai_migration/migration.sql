-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('CAPTION', 'STT');

-- CreateEnum
CREATE TYPE "ExecutionArtifactType" AS ENUM ('ACTION', 'BLOCKER', 'PENDING', 'RISK', 'DECISION');

-- CreateEnum
CREATE TYPE "VisibilityType" AS ENUM ('INTERNAL', 'CLIENT');

-- CreateEnum
CREATE TYPE "ConfidenceType" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'JOINED', 'CAPTURING', 'CAPTURED', 'FAILED');

-- CreateEnum
CREATE TYPE "PriorityType" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "meetingUrl" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptSegment" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "text" TEXT NOT NULL,
    "speaker" TEXT NOT NULL,
    "source" "SourceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranscriptSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingBotSession" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "browserSessionId" TEXT NOT NULL,
    "joinStartAt" TIMESTAMP(3),
    "joinEndAt" TIMESTAMP(3),
    "joinSuccess" BOOLEAN NOT NULL DEFAULT false,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingBotSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionArtifact" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "type" "ExecutionArtifactType" NOT NULL,
    "summary" TEXT NOT NULL,
    "owner" TEXT,
    "visibility" "VisibilityType" NOT NULL,
    "priority" "PriorityType" NOT NULL,
    "dueDate" TIMESTAMP(3),
    "confidence" "ConfidenceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceStartTime" TIMESTAMP(3) NOT NULL,
    "sourceEndTime" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutionArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_meetingUrl_key" ON "Meeting"("meetingUrl");

-- CreateIndex
CREATE INDEX "TranscriptSegment_meetingId_idx" ON "TranscriptSegment"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingBotSession_meetingId_idx" ON "MeetingBotSession"("meetingId");

-- CreateIndex
CREATE INDEX "ExecutionArtifact_meetingId_idx" ON "ExecutionArtifact"("meetingId");

-- AddForeignKey
ALTER TABLE "TranscriptSegment" ADD CONSTRAINT "TranscriptSegment_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingBotSession" ADD CONSTRAINT "MeetingBotSession_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionArtifact" ADD CONSTRAINT "ExecutionArtifact_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
