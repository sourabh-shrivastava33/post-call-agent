/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `ExecutionArtifact` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ExecutionArtifact_externalId_key" ON "ExecutionArtifact"("externalId");
