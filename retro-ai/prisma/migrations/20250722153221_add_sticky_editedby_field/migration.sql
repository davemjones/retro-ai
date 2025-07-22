-- AlterTable
ALTER TABLE "Sticky" ADD COLUMN     "editedBy" TEXT[] DEFAULT ARRAY[]::TEXT[];
