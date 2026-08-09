-- DropIndex
DROP INDEX "Availability_employeeId_weekday_key";

-- AlterTable
ALTER TABLE "Availability" DROP COLUMN "fromTime",
DROP COLUMN "toTime",
ADD COLUMN     "partOfDay" TEXT NOT NULL DEFAULT 'dopoldan';

-- CreateIndex
CREATE UNIQUE INDEX "Availability_employeeId_weekday_partOfDay_key" ON "Availability"("employeeId", "weekday", "partOfDay");

-- Doslej je razpoložljivost veljala za cel dan. Obstoječe vrstice so zdaj
-- dopoldanske; podvojimo jih še za popoldan, da se že vpisana izbira ohrani
-- za oba dela dneva.
INSERT INTO "Availability" ("id", "employeeId", "weekday", "partOfDay", "status", "note", "updatedAt")
SELECT gen_random_uuid()::text, "employeeId", "weekday", 'popoldan', "status", "note", "updatedAt"
FROM "Availability"
WHERE "partOfDay" = 'dopoldan';
