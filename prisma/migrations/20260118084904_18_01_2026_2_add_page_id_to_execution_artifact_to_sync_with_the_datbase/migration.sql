/*
  Warnings:

  - The values [FOLLOW_UP_AGENT] on the enum `ExecutionArtifactOrigin` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ExecutionArtifactOrigin_new" AS ENUM ('ACTION_ITEMS_AGENT', 'BLOCKER_AGENT', 'DEFAULT');
ALTER TABLE "public"."ExecutionArtifact" ALTER COLUMN "origin" DROP DEFAULT;
ALTER TABLE "ExecutionArtifact" ALTER COLUMN "origin" TYPE "ExecutionArtifactOrigin_new" USING ("origin"::text::"ExecutionArtifactOrigin_new");
ALTER TYPE "ExecutionArtifactOrigin" RENAME TO "ExecutionArtifactOrigin_old";
ALTER TYPE "ExecutionArtifactOrigin_new" RENAME TO "ExecutionArtifactOrigin";
DROP TYPE "public"."ExecutionArtifactOrigin_old";
ALTER TABLE "ExecutionArtifact" ALTER COLUMN "origin" SET DEFAULT 'DEFAULT';
COMMIT;

-- AlterTable
ALTER TABLE "ExecutionArtifact" ADD COLUMN     "pageId" TEXT;
