-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'employee',
    "pinHash" TEXT NOT NULL,
    "hourlyRate" REAL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "start" DATETIME NOT NULL,
    "end" DATETIME NOT NULL,
    "position" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Shift_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Shift_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "clockIn" DATETIME NOT NULL,
    "clockOut" DATETIME,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "editedById" TEXT,
    "editedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Employee_active_lastName_idx" ON "Employee"("active", "lastName");

-- CreateIndex
CREATE INDEX "Shift_employeeId_start_idx" ON "Shift"("employeeId", "start");

-- CreateIndex
CREATE INDEX "Shift_start_idx" ON "Shift"("start");

-- CreateIndex
CREATE INDEX "TimeEntry_employeeId_clockIn_idx" ON "TimeEntry"("employeeId", "clockIn");

-- CreateIndex
CREATE INDEX "TimeEntry_clockIn_idx" ON "TimeEntry"("clockIn");
