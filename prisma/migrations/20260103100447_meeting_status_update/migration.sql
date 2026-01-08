/*
  Warnings:

  - The `source` column on the `CaptionEvent` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MeetingStatus" ADD VALUE 'WORKFLOW_STARTED';
ALTER TYPE "MeetingStatus" ADD VALUE 'WORKFLOW_ENDED';

-- AlterTable
ALTER TABLE "CaptionEvent" DROP COLUMN "source",
ADD COLUMN     "source" "SourceType" NOT NULL DEFAULT 'CAPTION';

-- AlterTable
ALTER TABLE "TranscriptSegment" ALTER COLUMN "source" SET DEFAULT 'CAPTION';

-- DropEnum
DROP TYPE "TranscriptSource";
