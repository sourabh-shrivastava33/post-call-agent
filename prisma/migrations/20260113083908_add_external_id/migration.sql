-- AlterTable
ALTER TABLE "ExecutionArtifact" ADD COLUMN     "externalId" TEXT;

-- CreateIndex
CREATE INDEX "ExecutionArtifact_externalId_idx" ON "ExecutionArtifact"("externalId");
