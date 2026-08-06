/*
  Warnings:

  - You are about to drop the column `responseId` on the `Photo` table. All the data in the column will be lost.
  - Added the required column `inspectionId` to the `Photo` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Photo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inspectionId" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Photo" ("filePath", "id", "mimeType", "uploadedAt") SELECT "filePath", "id", "mimeType", "uploadedAt" FROM "Photo";
DROP TABLE "Photo";
ALTER TABLE "new_Photo" RENAME TO "Photo";
CREATE INDEX "Photo_inspectionId_idx" ON "Photo"("inspectionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
