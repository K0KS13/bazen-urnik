import { describe, expect, it } from "vitest";
import {
  APP_TIME_ZONE,
  addDays,
  formatDate,
  formatTime,
  isoWeekday,
  monthRange,
  parseLocalDate,
  parseLocalDateTime,
  startOfDay,
  startOfWeek,
  toLocalDateValue,
  zonedParts,
} from "@/lib/time";
import { derivePartOfDay } from "@/lib/parts-of-day";

/**
 * Ti testi tečejo v UTC (glej vitest.config.mts), izidi pa morajo biti v času
 * lokala. Tako odkrijejo vsako odvisnost od časovnega pasu procesa — natanko
 * napako, zaradi katere so se na gostitelju izmene izpisovale dve uri
 * prezgodaj.
 */
describe("neodvisnost od časovnega pasu procesa", () => {
  it("proces teče v UTC, aplikacija pa v času lokala", () => {
    expect(process.env.TZ).toBe("UTC");
    expect(APP_TIME_ZONE).toBe("Europe/Ljubljana");
  });

  it("poletni čas: 18:00 UTC je 20:00 v lokalu", () => {
    expect(formatTime(new Date("2026-08-26T18:00:00Z"))).toBe("20:00");
  });

  it("zimski čas: 18:00 UTC je 19:00 v lokalu", () => {
    expect(formatTime(new Date("2026-01-15T18:00:00Z"))).toBe("19:00");
  });

  it("dan se določi po lokalu, ne po UTC", () => {
    // 22:30 UTC v ponedeljek je že torek 00:30 v Ljubljani
    const trenutek = new Date("2026-08-10T22:30:00Z");
    expect(toLocalDateValue(trenutek)).toBe("2026-08-11");
    expect(isoWeekday(trenutek)).toBe(2);
    expect(formatDate(trenutek)).toBe("Tor 11. 8.");
  });
});

describe("meje dneva, tedna in meseca", () => {
  it("polnoč je polnoč v lokalu", () => {
    const zacetek = startOfDay(new Date("2026-08-10T22:30:00Z"));
    expect(formatTime(zacetek)).toBe("00:00");
    expect(toLocalDateValue(zacetek)).toBe("2026-08-11");
  });

  it("teden se začne v ponedeljek ob polnoči po lokalu", () => {
    const zacetek = startOfWeek(new Date("2026-08-13T23:30:00Z"));
    expect(toLocalDateValue(zacetek)).toBe("2026-08-10");
    expect(formatTime(zacetek)).toBe("00:00");
  });

  it("mesec se začne in konča ob polnoči po lokalu", () => {
    const { from, to } = monthRange(2026, 8);
    // 1. 8. 2026 00:00 v Ljubljani je 31. 7. 22:00 UTC
    expect(from.toISOString()).toBe("2026-07-31T22:00:00.000Z");
    expect(to.toISOString()).toBe("2026-08-31T22:00:00.000Z");
  });

  it("vnos ob 00:30 po lokalu pripada novemu mesecu", () => {
    const trenutek = new Date("2026-07-31T22:30:00Z"); // 1. 8. 00:30 v lokalu
    const { from } = monthRange(2026, 8);
    expect(trenutek >= from).toBe(true);
  });
});

describe("prehod na poletni in zimski čas", () => {
  // 2026: poletni čas se začne 29. 3., konča 25. 10.
  it("dan pred prehodom in po njem ostane ob isti uri", () => {
    const sobota = parseLocalDateTime("2026-03-28", "16:00")!;
    const nedelja = addDays(sobota, 1);
    expect(formatTime(nedelja)).toBe("16:00");
    expect(toLocalDateValue(nedelja)).toBe("2026-03-29");
  });

  it("prištevanje dni čez jesenski prehod ne premakne ure", () => {
    const sobota = parseLocalDateTime("2026-10-24", "20:00")!;
    const nedelja = addDays(sobota, 1);
    expect(formatTime(nedelja)).toBe("20:00");
    expect(toLocalDateValue(nedelja)).toBe("2026-10-25");
  });

  it("razlika v ISO času pokaže spremembo odmika", () => {
    const pred = parseLocalDateTime("2026-10-24", "20:00")!;
    const po = addDays(pred, 1);
    // 24 ur po stenski uri je 25 ur dejanskega časa, ker se ura premakne nazaj
    expect(po.getTime() - pred.getTime()).toBe(25 * 3600000);
  });
});

describe("razčlenjevanje vnosa", () => {
  it("datum iz obrazca je polnoč po lokalu", () => {
    expect(parseLocalDate("2026-08-10")!.toISOString()).toBe(
      "2026-08-09T22:00:00.000Z",
    );
  });

  it("datum in ura iz obrazca sta stenska ura lokala", () => {
    expect(parseLocalDateTime("2026-08-10", "16:00")!.toISOString()).toBe(
      "2026-08-10T14:00:00.000Z",
    );
  });

  it("neveljaven zapis vrne null", () => {
    expect(parseLocalDate("10.8.2026")).toBeNull();
    expect(parseLocalDateTime("2026-08-10", "25:00")).toBeNull();
  });
});

describe("del dneva se izpelje po uri lokala", () => {
  it("izmena ob 8:00 po lokalu je dopoldanska", () => {
    const start = parseLocalDateTime("2026-08-10", "08:00")!;
    expect(derivePartOfDay(start, addDays(start, 0))).toBe("dopoldan");
  });

  it("izmena ob 20:00 po lokalu je popoldanska", () => {
    const start = parseLocalDateTime("2026-08-10", "20:00")!;
    const end = new Date(start.getTime() + 6 * 3600000);
    expect(derivePartOfDay(start, end)).toBe("popoldan");
  });

  it("dolga izmena od 10:00 je celodnevna", () => {
    const start = parseLocalDateTime("2026-08-10", "10:00")!;
    const end = new Date(start.getTime() + 12 * 3600000);
    expect(derivePartOfDay(start, end)).toBe("celodnevna");
  });
});

describe("zonedParts", () => {
  it("razstavi trenutek po lokalu", () => {
    expect(zonedParts(new Date("2026-08-26T18:00:00Z"))).toEqual({
      year: 2026,
      month: 8,
      day: 26,
      hour: 20,
      minute: 0,
      second: 0,
      weekday: 3,
    });
  });
});
