/*
  Warnings:

  - You are about to drop the column `priority` on the `ExecutionArtifact` table. All the data in the column will be lost.
  - You are about to drop the column `visibility` on the `ExecutionArtifact` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ExecutionArtifact" DROP COLUMN "priority",
DROP COLUMN "visibility";

-- DropEnum
DROP TYPE "PriorityType";
