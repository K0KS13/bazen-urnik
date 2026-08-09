import { ActionForm } from "@/components/action-form";
import {
  deletePayRuleAction,
  savePayRuleAction,
  updateLateSettingsAction,
} from "@/lib/actions/settings";
import { WEEKDAY_LABELS, WEEKDAYS } from "@/lib/availability";
import { formatEuro } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMinutes, toLocalDateValue } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdmin();

  const [settings, rules] = await Promise.all([
    getSettings(),
    prisma.payRule.findMany({
      orderBy: [{ scope: "asc" }, { weekday: "asc" }, { date: "asc" }],
    }),
  ]);

  const weekdayRules = rules.filter((rule) => rule.scope === "weekday");
  const dateRules = rules.filter((rule) => rule.scope === "date");

  // Primer za trenutne nastavitve, da je pravilo takoj razumljivo.
  const example = [1, 2, 3].map((blocks) => {
    const from =
      settings.lateToleranceMinutes + (blocks - 1) * settings.lateBlockMinutes;
    const to = settings.lateToleranceMinutes + blocks * settings.lateBlockMinutes;
    return `${from + 1}–${to} min → ${formatMinutes(
      blocks * settings.latePenaltyMinutesPerBlock,
    )} h`;
  });

  return (
    <div className="flex flex-col gap-4">
      <section className="card">
        <h2 className="font-semibold">Dodatki na urno postavko</h2>
        <p className="mt-1 text-sm text-muted">
          Dodatek se prišteje osnovni urni postavki zaposlenega. Pravilo za
          konkreten datum prevlada nad pravilom za dan v tednu. Ker se dodatki
          upoštevajo ob izračunu, veljajo tudi za nazaj.
        </p>

        <ActionForm action={savePayRuleAction} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="scope" value="weekday" />
          <p className="label">Za dan v tednu</p>
          <div className="grid grid-cols-2 gap-3">
            <select name="weekday" className="field" defaultValue={6}>
              {WEEKDAYS.map((weekday) => (
                <option key={weekday} value={weekday}>
                  {WEEKDAY_LABELS[weekday]}
                </option>
              ))}
            </select>
            <input
              name="bonusPerHour"
              inputMode="decimal"
              className="field"
              placeholder="npr. 1,00"
              required
            />
          </div>
          <input name="label" className="field" placeholder="Opis (neobvezno)" />
          <button type="submit" className="btn-primary">
            Shrani dodatek za dan v tednu
          </button>
        </ActionForm>

        {weekdayRules.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {weekdayRules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2 text-sm"
              >
                <span>
                  {WEEKDAY_LABELS[rule.weekday ?? 0] ?? "—"}
                  {rule.label ? (
                    <span className="text-muted"> · {rule.label}</span>
                  ) : null}
                </span>
                <span className="font-mono tabular-nums">
                  +{formatEuro(rule.bonusPerHour)}/h
                </span>
                <ActionForm action={deletePayRuleAction} confirm="Izbrišem pravilo?">
                  <input type="hidden" name="id" value={rule.id} />
                  <button type="submit" className="btn-danger px-2 py-1 text-xs">
                    ✕
                  </button>
                </ActionForm>
              </li>
            ))}
          </ul>
        ) : null}

        <ActionForm action={savePayRuleAction} className="mt-5 flex flex-col gap-3">
          <input type="hidden" name="scope" value="date" />
          <p className="label">Za konkreten datum (praznik, naknadni dogovor)</p>
          <div className="grid grid-cols-2 gap-3">
            <input
              name="date"
              type="date"
              className="field"
              defaultValue={toLocalDateValue(new Date())}
              required
            />
            <input
              name="bonusPerHour"
              inputMode="decimal"
              className="field"
              placeholder="npr. 2,50"
              required
            />
          </div>
          <input name="label" className="field" placeholder="Opis (neobvezno)" />
          <button type="submit" className="btn-secondary">
            Shrani dodatek za datum
          </button>
        </ActionForm>

        {dateRules.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {dateRules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2 text-sm"
              >
                <span>
                  {rule.date ? formatDate(rule.date) : "—"}
                  {rule.label ? (
                    <span className="text-muted"> · {rule.label}</span>
                  ) : null}
                </span>
                <span className="font-mono tabular-nums">
                  +{formatEuro(rule.bonusPerHour)}/h
                </span>
                <ActionForm action={deletePayRuleAction} confirm="Izbrišem pravilo?">
                  <input type="hidden" name="id" value={rule.id} />
                  <button type="submit" className="btn-danger px-2 py-1 text-xs">
                    ✕
                  </button>
                </ActionForm>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="card">
        <h2 className="font-semibold">Odbijanje ur za zamujanje</h2>
        <p className="mt-1 text-sm text-muted">
          Zamuda se meri glede na začetek vpisane izmene. Vsak začeti blok nad
          toleranco pomeni en odbitek. Odbitek se izračuna ob prijavi in se
          zapiše k vnosu, zato poznejša sprememba teh nastavitev ne spremeni že
          obračunanih ur.
        </p>

        <ActionForm
          action={updateLateSettingsAction}
          className="mt-4 flex flex-col gap-3"
        >
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="latePenaltyEnabled"
              defaultChecked={settings.latePenaltyEnabled}
              className="h-5 w-5 accent-teal-400"
            />
            Odbijanje ur je vklopljeno
          </label>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label" htmlFor="lateToleranceMinutes">
                Tolerance (min)
              </label>
              <input
                id="lateToleranceMinutes"
                name="lateToleranceMinutes"
                type="number"
                min={0}
                max={120}
                className="field"
                defaultValue={settings.lateToleranceMinutes}
              />
            </div>
            <div>
              <label className="label" htmlFor="lateBlockMinutes">
                Blok (min)
              </label>
              <input
                id="lateBlockMinutes"
                name="lateBlockMinutes"
                type="number"
                min={1}
                max={120}
                className="field"
                defaultValue={settings.lateBlockMinutes}
              />
            </div>
            <div>
              <label className="label" htmlFor="latePenaltyMinutesPerBlock">
                Odbitek (min)
              </label>
              <input
                id="latePenaltyMinutesPerBlock"
                name="latePenaltyMinutesPerBlock"
                type="number"
                min={0}
                max={480}
                step={15}
                className="field"
                defaultValue={settings.latePenaltyMinutesPerBlock}
              />
            </div>
          </div>

          <div className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
            <p className="text-muted">Pri trenutnih nastavitvah:</p>
            <ul className="mt-1 font-mono text-xs tabular-nums">
              {example.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <button type="submit" className="btn-primary">
            Shrani
          </button>
        </ActionForm>

        <p className="mt-3 text-xs text-muted">
          Odtegljaji od plače so v Sloveniji pravno omejeni (ZDR-1). Pred uporabo
          se prepričaj, da je pravilo dogovorjeno z zaposlenimi.
        </p>
      </section>
    </div>
  );
}
