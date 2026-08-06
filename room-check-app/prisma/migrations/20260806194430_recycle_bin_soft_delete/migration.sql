-- AlterTable
ALTER TABLE "Camp" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "deletedAt" DATETIME;
