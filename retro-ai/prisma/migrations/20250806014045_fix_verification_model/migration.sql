/*
  Warnings:

  - You are about to drop the column `userId` on the `Verification` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Verification" DROP CONSTRAINT "Verification_userId_fkey";

-- AlterTable
ALTER TABLE "Verification" DROP COLUMN "userId";
