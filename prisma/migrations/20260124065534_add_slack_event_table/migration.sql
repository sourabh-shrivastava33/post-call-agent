-- CreateTable
CREATE TABLE "SlackEvent" (
    "id" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlackEvent_pkey" PRIMARY KEY ("id")
);
