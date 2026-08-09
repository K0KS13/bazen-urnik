import { NextResponse } from "next/server";
import { bonusForDate, rateForDate } from "@/lib/pay";
import { prisma } from "@/lib/prisma";
import { canManageSchedule } from "@/lib/roles";
import { getSessionUser } from "@/lib/session";
import {
  decimalHours,
  formatDate,
  formatTime,
  monthRange,
  workedMinutes,
} from "@/lib/time";

/** Vrednost, varna za CSV — ločilo je podpičje, kot ga pričakuje slovenski Excel. */
function csvCell(value: string | number | null): string {
  if (value === null) return "";
  const text = String(value);
  return /[";\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Decimalno število z vejico, kot ga pričakuje slovenski Excel. */
function csvNumber(value: number | null, decimals = 2): string {
  if (value === null) return "";
  return value.toFixed(decimals).replace(".", ",");
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || !canManageSchedule(user.role)) {
    return new NextResponse("Ni dostopa.", { status: 403 });
  }

  const url = new URL(request.url);
  const now = new Date();
  const year = Number(url.searchParams.get("leto")) || now.getFullYear();
  const month = Number(url.searchParams.get("mesec")) || now.getMonth() + 1;

  if (month < 1 || month > 12 || year < 2000 || year > 2100) {
    return new NextResponse("Neveljavno obdobje.", { status: 400 });
  }

  const { from, to } = monthRange(year, month);

  const [entries, payRules] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { clockIn: { gte: from, lt: to }, clockOut: { not: null } },
      orderBy: [{ employeeId: "asc" }, { clockIn: "asc" }],
      include: {
        employee: { select: { firstName: true, lastName: true, hourlyRate: true } },
      },
    }),
    prisma.payRule.findMany(),
  ]);

  const header = [
    "Priimek",
    "Ime",
    "Datum",
    "Prijava",
    "Odjava",
    "Odmor (min)",
    "Zamuda (min)",
    "Odbitek (min)",
    "Ure (decimalno)",
    "Osnovna postavka",
    "Dodatek na uro",
    "Postavka skupaj",
    "Bruto",
    "Opomba",
  ];

  const lines = [header.map(csvCell).join(";")];

  for (const entry of entries) {
    const minutes = workedMinutes(entry);
    const baseRate = entry.employee.hourlyRate;
    const bonus = bonusForDate(entry.clockIn, payRules);
    const rate = rateForDate(entry.clockIn, baseRate, payRules);

    lines.push(
      [
        csvCell(entry.employee.lastName),
        csvCell(entry.employee.firstName),
        csvCell(formatDate(entry.clockIn)),
        csvCell(formatTime(entry.clockIn)),
        csvCell(entry.clockOut ? formatTime(entry.clockOut) : ""),
        csvCell(entry.breakMinutes),
        csvCell(entry.lateMinutes),
        csvCell(entry.penaltyMinutes),
        csvCell(decimalHours(minutes)),
        csvNumber(baseRate),
        csvNumber(bonus),
        csvNumber(rate),
        csvNumber(rate === null ? null : (minutes / 60) * rate),
        csvCell(entry.note ?? ""),
      ].join(";"),
    );
  }

  // BOM, da Excel prepozna UTF-8 in pravilno prikaže šumnike.
  const body = `﻿${lines.join("\r\n")}\r\n`;
  const fileName = `bazen-ure-${year}-${String(month).padStart(2, "0")}.csv`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
