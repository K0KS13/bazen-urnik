import { describe, expect, it } from "vitest";
import { bonusForDate, grossPay, rateForDate, type PayRuleLike } from "@/lib/pay";

// 8. 8. 2026 je sobota, 10. 8. 2026 je ponedeljek.
const SOBOTA = new Date(2026, 7, 8, 18, 0);
const PONEDELJEK = new Date(2026, 7, 10, 18, 0);

const vikend: PayRuleLike = {
  scope: "weekday",
  weekday: 6,
  date: null,
  bonusPerHour: 1,
};
const naDatum: PayRuleLike = {
  scope: "date",
  weekday: null,
  date: new Date(2026, 7, 8),
  bonusPerHour: 2.5,
};

describe("bonusForDate", () => {
  it("brez pravil ni dodatka", () => {
    expect(bonusForDate(SOBOTA, [])).toBe(0);
  });

  it("upošteva pravilo za dan v tednu", () => {
    expect(bonusForDate(SOBOTA, [vikend])).toBe(1);
    expect(bonusForDate(PONEDELJEK, [vikend])).toBe(0);
  });

  it("pravilo za datum prevlada nad pravilom za dan v tednu", () => {
    expect(bonusForDate(SOBOTA, [vikend, naDatum])).toBe(2.5);
  });

  it("pravilo za datum velja ne glede na uro", () => {
    expect(bonusForDate(new Date(2026, 7, 8, 23, 59), [naDatum])).toBe(2.5);
  });
});

describe("rateForDate in grossPay", () => {
  it("brez osnovne postavke ni izračuna", () => {
    expect(rateForDate(SOBOTA, null, [vikend])).toBeNull();
    expect(grossPay(SOBOTA, 450, null, [vikend])).toBeNull();
  });

  it("postavka je osnova plus dodatek", () => {
    expect(rateForDate(SOBOTA, 10, [vikend])).toBe(11);
  });

  it("7,5 h po 11 € znese 82,50 €", () => {
    expect(grossPay(SOBOTA, 450, 10, [vikend])).toBeCloseTo(82.5, 2);
  });

  it("dodatek za datum, vpisan za nazaj, preračuna isti vnos", () => {
    expect(grossPay(SOBOTA, 450, 10, [vikend, naDatum])).toBeCloseTo(93.75, 2);
  });

  it("nič opravljenih minut pomeni nič", () => {
    expect(grossPay(SOBOTA, 0, 10, [vikend])).toBe(0);
  });
});
