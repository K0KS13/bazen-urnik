-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'employee',
    "pinHash" TEXT NOT NULL,
    "hourlyRate" DOUBLE PRECISION,
    "weeklyHoursTarget" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "position" TEXT,
    "partOfDay" TEXT,
    "positionId" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockOut" TIMESTAMP(3),
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "shiftId" TEXT,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "penaltyMinutes" INTEGER NOT NULL DEFAULT 0,
    "editedById" TEXT,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSkill" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EmployeeSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftTemplate" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "partOfDay" TEXT NOT NULL DEFAULT 'popoldan',
    "positionId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "peopleNeeded" INTEGER NOT NULL DEFAULT 1,
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "leadLevel" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'yes',
    "fromTime" TEXT,
    "toTime" TEXT,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayRule" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "weekday" INTEGER,
    "date" TIMESTAMP(3),
    "bonusPerHour" DOUBLE PRECISION NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Absence" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftOffer" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "offeredById" TEXT NOT NULL,
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "note" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftOffer_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "Position_name_key" ON "Position"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSkill_employeeId_positionId_key" ON "EmployeeSkill"("employeeId", "positionId");

-- CreateIndex
CREATE INDEX "ShiftTemplate_weekday_idx" ON "ShiftTemplate"("weekday");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_employeeId_weekday_key" ON "Availability"("employeeId", "weekday");

-- CreateIndex
CREATE INDEX "PayRule_scope_idx" ON "PayRule"("scope");

-- CreateIndex
CREATE INDEX "PayRule_date_idx" ON "PayRule"("date");

-- CreateIndex
CREATE INDEX "Absence_employeeId_startDate_idx" ON "Absence"("employeeId", "startDate");

-- CreateIndex
CREATE INDEX "Absence_status_startDate_idx" ON "Absence"("status", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftOffer_shiftId_key" ON "ShiftOffer"("shiftId");

-- CreateIndex
CREATE INDEX "ShiftOffer_status_idx" ON "ShiftOffer"("status");

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTemplate" ADD CONSTRAINT "ShiftTemplate_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftOffer" ADD CONSTRAINT "ShiftOffer_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftOffer" ADD CONSTRAINT "ShiftOffer_offeredById_fkey" FOREIGN KEY ("offeredById") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftOffer" ADD CONSTRAINT "ShiftOffer_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftOffer" ADD CONSTRAINT "ShiftOffer_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
