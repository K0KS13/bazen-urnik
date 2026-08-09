-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "failedLoginSince" TIMESTAMP(3);
