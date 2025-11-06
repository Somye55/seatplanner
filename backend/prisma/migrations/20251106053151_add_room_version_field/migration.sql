/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studentId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `branch` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Branch" AS ENUM ('ConsultingClub', 'InvestmentBankingClub', 'TechAndInnovationClub', 'EntrepreneurshipCell', 'SustainabilityAndCSRClub', 'WomenInBusiness', 'HealthcareManagementClub', 'RealEstateClub');

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_email_fkey";

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "branchAllocated" "Branch",
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "branch" "Branch" NOT NULL,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "studentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentId_key" ON "User"("studentId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
