import { ActionForm } from "@/components/action-form";
import { PartOfDayTimes } from "@/components/part-of-day-times";
import {
  addDefaultPositionsAction,
  createPositionAction,
  deleteClosedDayAction,
  deletePayRuleAction,
  deletePositionAction,
  deleteShiftTemplateAction,
  saveClosedDayAction,
  savePayRuleAction,
  saveShiftTemplateAction,
  updateLateSettingsAction,
  updateShiftHoursAction,
} from "@/lib/actions/settings";
import { WEEKDAY_LABELS, WEEKDAYS } from "@/lib/availability";
import { formatEuro, plural } from "@/lib/format";
import {
  defaultTimes,
  PART_CLASS,
  PART_LABELS,
  PARTS_OF_DAY,
  type PartOfDay,
} from "@/lib/parts-of-day";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMinutes, toLocalDateValue } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdmin();

  const [settings, rules, positions, closedDays, templates] = await Promise.all([
    getSettings(),
    prisma.payRule.findMany({
      orderBy: [{ scope: "asc" }, { weekday: "asc" }, { date: "asc" }],
    }),
    prisma.position.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.closedDay.findMany({
      orderBy: [{ scope: "asc" }, { weekday: "asc" }, { date: "asc" }],
    }),
    prisma.shiftTemplate.findMany({
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
      include: { position: { select: { name: true } } },
    }),
  ]);

  const weekdayRules = rules.filter((rule) => rule.scope === "weekday");
  const dateRules = rules.filter((rule) => rule.scope === "date");

  const partDefaults = Object.fromEntries(
    PARTS_OF_DAY.map((part) => [part, defaultTimes(part, settings)]),
  ) as Record<PartOfDay, { start: string; end: string }>;

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
        <h2 className="font-semibold">Delovna mesta</h2>
        <p className="mt-1 text-sm text-muted">
          Podlaga za ocene zaposlenih in za predloge izmen.
        </p>

        {positions.length === 0 ? (
          <ActionForm action={addDefaultPositionsAction} className="mt-3">
            <button type="submit" className="btn-secondary w-full">
              Dodaj privzeta (Šank, Kuhinja, Strežba, Bazen)
            </button>
          </ActionForm>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {positions.map((position) => (
              <li
                key={position.id}
                className="flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-sm"
              >
                {position.name}
                <ActionForm
                  action={deletePositionAction}
                  confirm={`Izbrišem »${position.name}«? Predloge in ocene zanj se pobrišejo.`}
                >
                  <input type="hidden" name="id" value={position.id} />
                  <button
                    type="submit"
                    aria-label={`Izbriši ${position.name}`}
                    className="text-danger"
                  >
                    ✕
                  </button>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}

        <ActionForm action={createPositionAction} className="mt-3 flex gap-2">
          <input
            name="name"
            className="field flex-1"
            placeholder="Novo delovno mesto"
            required
          />
          <button type="submit" className="btn-secondary">
            Dodaj
          </button>
        </ActionForm>
      </section>

      <section className="card">
        <h2 className="font-semibold">Zaprti dnevi</h2>
        <p className="mt-1 text-sm text-muted">
          Na te dneve se urnik ne sestavlja in kopiranje tedna jih preskoči. Če
          kljub temu vpišeš izmeno (zaprta zabava, čiščenje), te aplikacija le
          opozori.
        </p>

        {closedDays.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {closedDays.map((day) => (
              <li
                key={day.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2 text-sm"
              >
                <span>
                  {day.scope === "weekday"
                    ? `Vsak ${WEEKDAY_LABELS[day.weekday ?? 0]?.toLowerCase() ?? "—"}`
                    : day.date
                      ? formatDate(day.date)
                      : "—"}
                  {day.note ? (
                    <span className="text-muted"> · {day.note}</span>
                  ) : null}
                </span>
                <ActionForm
                  action={deleteClosedDayAction}
                  confirm="Ta dan spet odprt?"
                >
                  <input type="hidden" name="id" value={day.id} />
                  <button type="submit" className="btn-danger px-2 py-1 text-xs">
                    ✕
                  </button>
                </ActionForm>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">Ni označenih zaprtih dni.</p>
        )}

        <ActionForm action={saveClosedDayAction} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="scope" value="weekday" />
          <p className="label">Vsak teden zaprto</p>
          <div className="flex gap-2">
            <select name="weekday" className="field flex-1" defaultValue={1}>
              {WEEKDAYS.map((weekday) => (
                <option key={weekday} value={weekday}>
                  {WEEKDAY_LABELS[weekday]}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-secondary">
              Označi
            </button>
          </div>
        </ActionForm>

        <ActionForm action={saveClosedDayAction} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="scope" value="date" />
          <p className="label">Zaprto na določen datum</p>
          <div className="flex gap-2">
            <input
              name="date"
              type="date"
              className="field flex-1"
              defaultValue={toLocalDateValue(new Date())}
              required
            />
            <button type="submit" className="btn-secondary">
              Označi
            </button>
          </div>
          <input name="note" className="field" placeholder="Razlog (neobvezno)" />
        </ActionForm>
      </section>

      <section className="card">
        <h2 className="font-semibold">Privzete ure izmen</h2>
        <p className="mt-1 text-sm text-muted">
          Izhodišče za vpis izmene in za predloge — ure ostanejo popravljive.
          Konec pred začetkom pomeni čez polnoč (npr. 16:00–00:00).
        </p>

        <ActionForm
          resetKey={settings.updatedAt.toISOString()}
          action={updateShiftHoursAction}
          className="mt-3 flex flex-col gap-3"
        >
          {(
            [
              ["dopoldan", "morningStart", "morningEnd"],
              ["celodnevna", "alldayStart", "alldayEnd"],
              ["popoldan", "eveningStart", "eveningEnd"],
            ] as const
          ).map(([part, startField, endField]) => (
            <div key={part} className="flex items-center gap-2">
              <span
                className={`w-28 shrink-0 rounded-full px-2 py-1 text-center text-xs font-semibold ring-1 ${PART_CLASS[part]}`}
              >
                {PART_LABELS[part]}
              </span>
              <input
                name={startField}
                type="time"
                className="field flex-1 py-1.5 text-sm"
                defaultValue={settings[startField]}
                required
              />
              <span className="text-xs text-muted">do</span>
              <input
                name={endField}
                type="time"
                className="field flex-1 py-1.5 text-sm"
                defaultValue={settings[endField]}
                required
              />
            </div>
          ))}

          <button type="submit" className="btn-primary">
            Shrani privzete ure
          </button>
        </ActionForm>
      </section>

      <section className="card">
        <h2 className="font-semibold">Predloge izmen</h2>
        <p className="mt-1 text-sm text-muted">
          Prednastavljene ure po dnevih. Iz njih se sestavi samodejni urnik —
          gumb je v zavihku <span className="text-foreground">Urnik</span>.
        </p>

        {positions.length === 0 ? (
          <p className="mt-3 text-sm text-warning">
            Najprej dodaj delovna mesta.
          </p>
        ) : (
          <ActionForm
            action={saveShiftTemplateAction}
            className="mt-3 flex flex-col gap-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="tpl-weekday">
                  Dan
                </label>
                <select id="tpl-weekday" name="weekday" className="field" defaultValue={5}>
                  {WEEKDAYS.map((weekday) => (
                    <option key={weekday} value={weekday}>
                      {WEEKDAY_LABELS[weekday]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="tpl-position">
                  Delovno mesto
                </label>
                <select id="tpl-position" name="positionId" className="field" required>
                  {positions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <PartOfDayTimes defaults={partDefaults} />

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label" htmlFor="tpl-people">
                  Ljudi
                </label>
                <input
                  id="tpl-people"
                  name="peopleNeeded"
                  type="number"
                  min={1}
                  max={20}
                  className="field"
                  defaultValue={1}
                />
              </div>
              <div>
                <label className="label" htmlFor="tpl-min">
                  Najniž. ocena
                </label>
                <input
                  id="tpl-min"
                  name="minLevel"
                  type="number"
                  min={0}
                  max={5}
                  className="field"
                  defaultValue={1}
                />
              </div>
              <div>
                <label className="label" htmlFor="tpl-lead">
                  Vsaj eden z oceno
                </label>
                <input
                  id="tpl-lead"
                  name="leadLevel"
                  type="number"
                  min={1}
                  max={5}
                  className="field"
                  placeholder="npr. 4"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary">
              Dodaj predlogo
            </button>
          </ActionForm>
        )}

        {templates.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-2">
            {templates.map((template) => (
              <li
                key={template.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-medium">
                    {WEEKDAY_LABELS[template.weekday]}
                  </span>{" "}
                  · {template.position.name}
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
                      PART_CLASS[template.partOfDay as PartOfDay] ?? ""
                    }`}
                  >
                    {PART_LABELS[template.partOfDay as PartOfDay] ??
                      template.partOfDay}
                  </span>
                  <span className="block text-xs text-muted">
                    {template.startTime}–{template.endTime} ·{" "}
                    {plural(template.peopleNeeded, [
                      "oseba",
                      "osebi",
                      "osebe",
                      "oseb",
                    ])}
                    {" · ocena ≥ "}
                    {template.minLevel}
                    {template.leadLevel
                      ? ` · vsaj eden ≥ ${template.leadLevel}`
                      : ""}
                  </span>
                </span>
                <ActionForm
                  action={deleteShiftTemplateAction}
                  confirm="Izbrišem predlogo?"
                >
                  <input type="hidden" name="id" value={template.id} />
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
          resetKey={settings.updatedAt.toISOString()}
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
