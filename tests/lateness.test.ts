import { describe, expect, it } from "vitest";
import { computeLateness } from "@/lib/lateness";

const PRIVZETO = {
  latePenaltyEnabled: true,
  lateToleranceMinutes: 0,
  lateBlockMinutes: 15,
  latePenaltyMinutesPerBlock: 60,
};

const zamuda = (minut: number, nastavitve = PRIVZETO) =>
  computeLateness(
    new Date(2026, 7, 10, 16, minut),
    new Date(2026, 7, 10, 16, 0),
    nastavitve,
  );

describe("computeLateness — dogovorjena lestvica", () => {
  it("brez zamude ni odbitka", () => {
    expect(zamuda(0)).toEqual({ lateMinutes: 0, penaltyMinutes: 0 });
  });

  it("1–15 min zamude pomeni eno uro", () => {
    expect(zamuda(1).penaltyMinutes).toBe(60);
    expect(zamuda(15).penaltyMinutes).toBe(60);
  });

  it("16–30 min pomeni dve uri", () => {
    expect(zamuda(16).penaltyMinutes).toBe(120);
    expect(zamuda(30).penaltyMinutes).toBe(120);
  });

  it("31–45 min pomeni tri ure", () => {
    expect(zamuda(31).penaltyMinutes).toBe(180);
    expect(zamuda(45).penaltyMinutes).toBe(180);
  });

  it("zabeleži dejansko zamudo, ne le odbitka", () => {
    expect(zamuda(41).lateMinutes).toBe(41);
    expect(zamuda(41).penaltyMinutes).toBe(180);
  });
});

describe("computeLateness — robni primeri", () => {
  it("izklopljeno odbijanje zamudo zabeleži, a ne odbije", () => {
    const r = zamuda(40, { ...PRIVZETO, latePenaltyEnabled: false });
    expect(r).toEqual({ lateMinutes: 40, penaltyMinutes: 0 });
  });

  it("brez načrtovane izmene ni ne zamude ne odbitka", () => {
    expect(computeLateness(new Date(), null, PRIVZETO)).toEqual({
      lateMinutes: 0,
      penaltyMinutes: 0,
    });
  });

  it("prihod pred začetkom ne šteje kot zamuda", () => {
    expect(zamuda(-10)).toEqual({ lateMinutes: 0, penaltyMinutes: 0 });
  });

  it("tolerance zamudo do meje spregleda", () => {
    const s = { ...PRIVZETO, lateToleranceMinutes: 10 };
    expect(zamuda(10, s).penaltyMinutes).toBe(0);
    expect(zamuda(11, s).penaltyMinutes).toBe(60);
    expect(zamuda(25, s).penaltyMinutes).toBe(60);
    expect(zamuda(26, s).penaltyMinutes).toBe(120);
  });

  it("velikost bloka nič ne povzroči deljenja z nič", () => {
    const r = zamuda(5, { ...PRIVZETO, lateBlockMinutes: 0 });
    expect(Number.isFinite(r.penaltyMinutes)).toBe(true);
  });
});
