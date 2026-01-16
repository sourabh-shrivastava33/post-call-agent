/*
  Warnings:

  - Made the column `externalId` on table `ExecutionArtifact` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ExecutionArtifactOrigin" AS ENUM ('ACTION_ITEMS_AGENT', 'BLOCKER_AGENT', 'FOLLOW_UP_AGENT', 'DEFAULT');

-- CreateEnum
CREATE TYPE "ExecutionArtifactStatus" AS ENUM ('PLANNED', 'CONFIRMED', 'BLOCKED', 'COMPLETED');

-- AlterTable
ALTER TABLE "ExecutionArtifact" ADD COLUMN     "origin" "ExecutionArtifactOrigin" NOT NULL DEFAULT 'DEFAULT',
ADD COLUMN     "status" "ExecutionArtifactStatus" NOT NULL DEFAULT 'PLANNED',
ALTER COLUMN "confidence" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "externalId" SET NOT NULL;
