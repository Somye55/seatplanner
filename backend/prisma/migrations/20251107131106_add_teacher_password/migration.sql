/*
  Warnings:

  - Made the column `blockId` on table `Building` required. This step will fail if there are existing NULL values in that column.
  - Made the column `floorId` on table `Room` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Building" ALTER COLUMN "blockId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Room" ALTER COLUMN "floorId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "password" TEXT NOT NULL DEFAULT 'teacher123';
