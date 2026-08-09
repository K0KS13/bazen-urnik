-- AlterTable
ALTER TABLE "Shift" ADD COLUMN "partOfDay" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "latePenaltyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lateToleranceMinutes" INTEGER NOT NULL DEFAULT 0,
    "lateBlockMinutes" INTEGER NOT NULL DEFAULT 15,
    "latePenaltyMinutesPerBlock" INTEGER NOT NULL DEFAULT 60,
    "morningStart" TEXT NOT NULL DEFAULT '08:00',
    "morningEnd" TEXT NOT NULL DEFAULT '16:00',
    "alldayStart" TEXT NOT NULL DEFAULT '10:00',
    "alldayEnd" TEXT NOT NULL DEFAULT '22:00',
    "eveningStart" TEXT NOT NULL DEFAULT '16:00',
    "eveningEnd" TEXT NOT NULL DEFAULT '00:00',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("id", "lateBlockMinutes", "latePenaltyEnabled", "latePenaltyMinutesPerBlock", "lateToleranceMinutes", "updatedAt") SELECT "id", "lateBlockMinutes", "latePenaltyEnabled", "latePenaltyMinutesPerBlock", "lateToleranceMinutes", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE TABLE "new_ShiftTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekday" INTEGER NOT NULL,
    "partOfDay" TEXT NOT NULL DEFAULT 'popoldan',
    "positionId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "peopleNeeded" INTEGER NOT NULL DEFAULT 1,
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "leadLevel" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShiftTemplate_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ShiftTemplate" ("active", "createdAt", "endTime", "id", "leadLevel", "minLevel", "peopleNeeded", "positionId", "startTime", "weekday") SELECT "active", "createdAt", "endTime", "id", "leadLevel", "minLevel", "peopleNeeded", "positionId", "startTime", "weekday" FROM "ShiftTemplate";
DROP TABLE "ShiftTemplate";
ALTER TABLE "new_ShiftTemplate" RENAME TO "ShiftTemplate";
CREATE INDEX "ShiftTemplate_weekday_idx" ON "ShiftTemplate"("weekday");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
