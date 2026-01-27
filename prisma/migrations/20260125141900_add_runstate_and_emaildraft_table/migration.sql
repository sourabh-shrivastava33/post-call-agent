-- CreateTable
CREATE TABLE "RunState" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "state_json" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDraft" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "to_original" TEXT,
    "to_confirmed" TEXT,
    "subject" TEXT NOT NULL,
    "original_body" TEXT NOT NULL,
    "edited_body" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RunState_meetingId_idx" ON "RunState"("meetingId");
