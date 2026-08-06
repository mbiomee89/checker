-- CreateTable
CREATE TABLE "Camp" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Room" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campId" INTEGER NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "approvedCapacity" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Room_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "campId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sequenceNo" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "inputType" TEXT NOT NULL DEFAULT 'MULTI_SELECT',
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "ChecklistItemOption" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "checklistItemId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isClearOption" BOOLEAN NOT NULL DEFAULT false,
    "requiresAction" BOOLEAN NOT NULL DEFAULT false,
    "kind" TEXT NOT NULL DEFAULT 'TOGGLE',
    CONSTRAINT "ChecklistItemOption_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roomId" INTEGER NOT NULL,
    "campId" INTEGER NOT NULL,
    "inspectorId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "headcount" INTEGER,
    "notes" TEXT,
    "inspectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Inspection_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inspection_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inspection_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionResident" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inspectionId" INTEGER NOT NULL,
    "residentIdNumber" TEXT NOT NULL,
    CONSTRAINT "InspectionResident_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionResponse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inspectionId" INTEGER NOT NULL,
    "checklistItemId" INTEGER NOT NULL,
    "commentText" TEXT,
    "textValue" TEXT,
    CONSTRAINT "InspectionResponse_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InspectionResponse_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionResponseOption" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "responseId" INTEGER NOT NULL,
    "optionId" INTEGER NOT NULL,
    "count" INTEGER,
    CONSTRAINT "InspectionResponseOption_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "InspectionResponse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InspectionResponseOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ChecklistItemOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "responseId" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "InspectionResponse" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CorrectiveAction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roomId" INTEGER NOT NULL,
    "checklistItemId" INTEGER NOT NULL,
    "optionId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dueDate" DATETIME,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CorrectiveAction_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CorrectiveAction_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CorrectiveAction_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ChecklistItemOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriorityFlag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campId" INTEGER NOT NULL,
    "checklistItemId" INTEGER NOT NULL,
    "optionId" INTEGER NOT NULL,
    "flaggedById" INTEGER NOT NULL,
    "flaggedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriorityFlag_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PriorityFlag_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PriorityFlag_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ChecklistItemOption" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PriorityFlag_flaggedById_fkey" FOREIGN KEY ("flaggedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Room_campId_idx" ON "Room"("campId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_campId_roomNumber_key" ON "Room"("campId", "roomNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_campId_idx" ON "User"("campId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItem_sequenceNo_key" ON "ChecklistItem"("sequenceNo");

-- CreateIndex
CREATE INDEX "ChecklistItemOption_checklistItemId_idx" ON "ChecklistItemOption"("checklistItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItemOption_checklistItemId_label_key" ON "ChecklistItemOption"("checklistItemId", "label");

-- CreateIndex
CREATE INDEX "Inspection_roomId_inspectedAt_idx" ON "Inspection"("roomId", "inspectedAt");

-- CreateIndex
CREATE INDEX "Inspection_campId_inspectedAt_idx" ON "Inspection"("campId", "inspectedAt");

-- CreateIndex
CREATE INDEX "InspectionResident_inspectionId_idx" ON "InspectionResident"("inspectionId");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionResponse_inspectionId_checklistItemId_key" ON "InspectionResponse"("inspectionId", "checklistItemId");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionResponseOption_responseId_optionId_key" ON "InspectionResponseOption"("responseId", "optionId");

-- CreateIndex
CREATE INDEX "Photo_responseId_idx" ON "Photo"("responseId");

-- CreateIndex
CREATE INDEX "CorrectiveAction_status_dueDate_idx" ON "CorrectiveAction"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "CorrectiveAction_roomId_checklistItemId_optionId_key" ON "CorrectiveAction"("roomId", "checklistItemId", "optionId");

-- CreateIndex
CREATE UNIQUE INDEX "PriorityFlag_campId_checklistItemId_optionId_key" ON "PriorityFlag"("campId", "checklistItemId", "optionId");
