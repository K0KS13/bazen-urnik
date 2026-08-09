export type LatenessSettings = {
  latePenaltyEnabled: boolean;
  lateToleranceMinutes: number;
  lateBlockMinutes: number;
  latePenaltyMinutesPerBlock: number;
};

/**
 * Zamuda glede na načrtovan začetek izmene in odbitek zanjo.
 *
 * Vsak *začeti* blok zamude nad dovoljeno toleranco pomeni en odbitek. Pri
 * privzetih nastavitvah (blok 15 min, odbitek 60 min) to pomeni: 1–15 min
 * zamude je ena ura, 16–30 min dve uri, 31–45 min tri ure in tako naprej.
 *
 * Izračuna se ob prijavi in se shrani k vnosu, da poznejša sprememba
 * nastavitev ne spremeni že obračunanih ur.
 */
export function computeLateness(
  clockIn: Date,
  shiftStart: Date | null,
  settings: LatenessSettings,
): { lateMinutes: number; penaltyMinutes: number } {
  if (!shiftStart) return { lateMinutes: 0, penaltyMinutes: 0 };

  const lateMinutes = Math.max(
    0,
    Math.round((clockIn.getTime() - shiftStart.getTime()) / 60000),
  );

  if (!settings.latePenaltyEnabled || lateMinutes === 0) {
    return { lateMinutes, penaltyMinutes: 0 };
  }

  const overTolerance = lateMinutes - settings.lateToleranceMinutes;
  if (overTolerance <= 0) return { lateMinutes, penaltyMinutes: 0 };

  const blockSize = Math.max(1, settings.lateBlockMinutes);
  const blocks = Math.ceil(overTolerance / blockSize);
  return {
    lateMinutes,
    penaltyMinutes: blocks * settings.latePenaltyMinutesPerBlock,
  };
}
