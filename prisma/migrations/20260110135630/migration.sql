/*
  Warnings:

  - Changed the type of `confidence` on the `ExecutionArtifact` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "ExecutionArtifact" DROP COLUMN "confidence",
ADD COLUMN     "confidence" INTEGER NOT NULL;
