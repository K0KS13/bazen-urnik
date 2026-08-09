import { describe, expect, it } from "vitest";
import {
  daysBetween,
  decimalHours,
  formatMinutes,
  formatTime,
  grossMinutes,
  isoWeekday,
  monthRange,
  parseLocalDate,
  parseLocalDateTime,
  startOfWeek,
  toLocalDateValue,
  workedMinutes,
} from "@/lib/time";

describe("workedMinutes", () => {
  const entry = (from: string, to: string | null, breakMinutes = 0, penaltyMinutes = 0) => ({
    clockIn: new Date(from),
    clockOut: to ? new Date(to) : null,
    breakMinutes,
    penaltyMinutes,
  });

  it("odšteje odmor in odbitek za zamudo", () => {
    // 8 h bruto, 30 min odmora, 60 min odbitka
    expect(workedMinutes(entry("2026-08-10T08:00", "2026-08-10T16:00", 30, 60))).toBe(390);
  });

  it("vnos brez odjave šteje nič", () => {
    expect(workedMinutes(entry("2026-08-10T08:00", null))).toBe(0);
  });

  it("ne gre v minus, ko odbitek preseže opravljeni čas", () => {
    expect(workedMinutes(entry("2026-08-10T08:00", "2026-08-10T09:00", 0, 180))).toBe(0);
  });

  it("pravilno šteje izmeno čez polnoč", () => {
    expect(grossMinutes(entry("2026-08-10T20:00", "2026-08-11T02:00"))).toBe(360);
  });
});

describe("isoWeekday", () => {
  it("ponedeljek je 1 in nedelja 7", () => {
    expect(isoWeekday(parseLocalDateTime("2026-08-10", "12:00")!)).toBe(1);
    expect(isoWeekday(parseLocalDateTime("2026-08-16", "12:00")!)).toBe(7);
  });

  it("izmena, ki se konča po polnoči, pripada dnevu začetka", () => {
    // petek 20:00 -> sobota 02:00; začetek je petek
    expect(isoWeekday(parseLocalDateTime("2026-08-14", "20:00")!)).toBe(5);
  });
});

describe("startOfWeek", () => {
  it("vrne ponedeljek ob polnoči po času lokala", () => {
    const start = startOfWeek(parseLocalDateTime("2026-08-13", "23:30")!);
    expect(toLocalDateValue(start)).toBe("2026-08-10");
    expect(formatTime(start)).toBe("00:00");
  });

  it("nedelja pripada tednu, ki se je začel v ponedeljek", () => {
    const nedelja = parseLocalDateTime("2026-08-16", "12:00")!;
    expect(toLocalDateValue(startOfWeek(nedelja))).toBe("2026-08-10");
  });
});

describe("monthRange", () => {
  it("zajame cel mesec in izključi prvi dan naslednjega", () => {
    const { from, to } = monthRange(2026, 8);
    expect(toLocalDateValue(from)).toBe("2026-08-01");
    expect(toLocalDateValue(to)).toBe("2026-09-01");
    expect(formatTime(from)).toBe("00:00");
  });

  it("dela tudi za december", () => {
    const { to } = monthRange(2026, 12);
    expect(toLocalDateValue(to)).toBe("2027-01-01");
  });
});

describe("izpis", () => {
  it("formatMinutes izpiše ure in minute", () => {
    expect(formatMinutes(456)).toBe("7:36");
    expect(formatMinutes(60)).toBe("1:00");
    expect(formatMinutes(0)).toBe("0:00");
  });

  it("decimalHours uporabi vejico", () => {
    expect(decimalHours(456)).toBe("7,60");
    expect(decimalHours(450)).toBe("7,50");
  });

  it("daysBetween šteje oba dneva", () => {
    const dan = (iso: string) => parseLocalDate(iso)!;
    expect(daysBetween(dan("2026-08-10"), dan("2026-08-10"))).toBe(1);
    expect(daysBetween(dan("2026-08-10"), dan("2026-08-12"))).toBe(3);
    // čez jesenski prehod, kjer ima en dan 25 ur
    expect(daysBetween(dan("2026-10-24"), dan("2026-10-26"))).toBe(3);
  });
});
