/*
  Warnings:

  - Added the required column `interruption_id` to the `EmailDraft` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EmailDraft" ADD COLUMN     "interruption_id" TEXT NOT NULL;
