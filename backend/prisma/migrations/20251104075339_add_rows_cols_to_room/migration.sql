/*
  Warnings:

  - Added the required column `cols` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rows` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "cols" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rows" INTEGER NOT NULL DEFAULT 0;
