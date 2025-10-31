-- AlterTable
ALTER TABLE "Seat" ADD COLUMN     "features" TEXT[],
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;
