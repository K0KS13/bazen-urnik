import { describe, expect, it } from "vitest";
import {
  buildSchedule,
  slotFromTemplate,
  type SchedulerCandidate,
  type SchedulerSlot,
} from "@/lib/scheduler";

const SANK = "sank";
const KUHINJA = "kuhinja";

/** 10. 8. 2026 je ponedeljek (dan 1). */
function slot(overrides: Partial<SchedulerSlot> = {}): SchedulerSlot {
  return {
    templateId: "t1",
    positionId: SANK,
    positionName: "Šank",
    partOfDay: "popoldan",
    start: new Date(2026, 7, 10, 16, 0),
    end: new Date(2026, 7, 10, 22, 0),
    peopleNeeded: 1,
    minLevel: 1,
    leadLevel: null,
    ...overrides,
  };
}

function candidate(
  id: string,
  overrides: Partial<SchedulerCandidate> = {},
): SchedulerCandidate {
  return {
    id,
    skillByPosition: { [SANK]: 5 },
    availability: {},
    absentDays: new Set(),
    weeklyHoursTarget: null,
    assignedMinutes: 0,
    busy: [],
    sortKey: id,
    ...overrides,
  };
}

const dodeljeni = (r: ReturnType<typeof buildSchedule>) =>
  r.assignments.map((a) => a.employeeId);

describe("razpoložljivost po delih dneva", () => {
  it("kdor popoldne ne more, popoldanske izmene ne dobi", () => {
    const r = buildSchedule(
      [slot()],
      [candidate("a", { availability: { "1:popoldan": "no" } })],
    );
    expect(dodeljeni(r)).toEqual([]);
    expect(r.gaps[0]?.missing).toBe(1);
  });

  it("celodnevna izmena zahteva oba dela dneva", () => {
    const celodnevna = slot({ partOfDay: "celodnevna", start: new Date(2026, 7, 10, 10, 0) });
    const r = buildSchedule(
      [celodnevna],
      [candidate("a", { availability: { "1:dopoldan": "no", "1:popoldan": "yes" } })],
    );
    expect(dodeljeni(r)).toEqual([]);
  });

  it("brez vpisane razpoložljivosti se šteje, da je na voljo", () => {
    expect(dodeljeni(buildSchedule([slot()], [candidate("a")]))).toEqual(["a"]);
  });

  it("prednost ima zanesljivo na voljo pred po dogovoru", () => {
    const r = buildSchedule(
      [slot()],
      [
        candidate("aPoDogovoru", { availability: { "1:popoldan": "maybe" } }),
        candidate("bLahko", { availability: { "1:popoldan": "yes" } }),
      ],
    );
    expect(dodeljeni(r)).toEqual(["bLahko"]);
  });
});

describe("ocene in izkušenost", () => {
  it("prenizka ocena za delovno mesto izloči kandidata", () => {
    const r = buildSchedule(
      [slot({ minLevel: 3 })],
      [candidate("a", { skillByPosition: { [SANK]: 2 } })],
    );
    expect(dodeljeni(r)).toEqual([]);
  });

  it("zahteva po vsaj enem izkušenem se upošteva", () => {
    const r = buildSchedule(
      [slot({ peopleNeeded: 2, leadLevel: 4 })],
      [
        candidate("zacetnik1", { skillByPosition: { [SANK]: 1 } }),
        candidate("zacetnik2", { skillByPosition: { [SANK]: 1 } }),
      ],
    );
    // eno mesto zapolni začetnik, drugo ostane prazno, ker izkušenega ni
    expect(r.assignments).toHaveLength(1);
    expect(r.gaps[0]?.missing).toBe(1);
  });

  it("izkušenega razporedi, ko je na voljo", () => {
    const r = buildSchedule(
      [slot({ peopleNeeded: 2, leadLevel: 4 })],
      [
        candidate("zacetnik", { skillByPosition: { [SANK]: 1 } }),
        candidate("izkusen", { skillByPosition: { [SANK]: 5 } }),
      ],
    );
    expect(r.assignments).toHaveLength(2);
    expect(dodeljeni(r)).toContain("izkusen");
    expect(r.gaps).toHaveLength(0);
  });
});

describe("odsotnosti in prekrivanja", () => {
  it("odobrena odsotnost izloči kandidata", () => {
    const r = buildSchedule(
      [slot()],
      [candidate("a", { absentDays: new Set(["2026-08-10"]) })],
    );
    expect(dodeljeni(r)).toEqual([]);
  });

  it("kdor v tem času že dela, ne dobi druge izmene", () => {
    const r = buildSchedule(
      [slot()],
      [
        candidate("a", {
          busy: [
            {
              start: new Date(2026, 7, 10, 15, 0).getTime(),
              end: new Date(2026, 7, 10, 20, 0).getTime(),
            },
          ],
        }),
      ],
    );
    expect(dodeljeni(r)).toEqual([]);
  });

  it("iste osebe ne razporedi na dve prekrivajoči se mesti", () => {
    const a = slot({ templateId: "a", positionId: SANK });
    const b = slot({ templateId: "b", positionId: KUHINJA, positionName: "Kuhinja" });
    const r = buildSchedule(
      [a, b],
      [candidate("edini", { skillByPosition: { [SANK]: 5, [KUHINJA]: 5 } })],
    );
    expect(r.assignments).toHaveLength(1);
    expect(r.gaps).toHaveLength(1);
  });
});

describe("cilj ur je mehka omejitev", () => {
  it("najprej razporedi tistega, ki cilja še ni dosegel", () => {
    const r = buildSchedule(
      [slot()],
      [
        candidate("poln", { weeklyHoursTarget: 10, assignedMinutes: 600 }),
        candidate("prazen", { weeklyHoursTarget: 40, assignedMinutes: 0 }),
      ],
    );
    expect(dodeljeni(r)).toEqual(["prazen"]);
  });

  it("če bi mesto sicer ostalo prazno, gre kdo čez cilj", () => {
    const r = buildSchedule(
      [slot()],
      [candidate("poln", { weeklyHoursTarget: 10, assignedMinutes: 600 })],
    );
    expect(dodeljeni(r)).toEqual(["poln"]);
    expect(r.gaps).toHaveLength(0);
  });
});

describe("slotFromTemplate", () => {
  const predloga = {
    id: "t",
    positionId: SANK,
    partOfDay: "popoldan",
    startTime: "20:00",
    endTime: "02:00",
    peopleNeeded: 1,
    minLevel: 1,
    leadLevel: null,
    position: { name: "Šank" },
  };

  it("izmena čez polnoč se konča naslednji dan", () => {
    const s = slotFromTemplate(new Date(2026, 7, 10), predloga)!;
    expect(s.start.getDate()).toBe(10);
    expect(s.end.getDate()).toBe(11);
    expect(s.end.getTime() - s.start.getTime()).toBe(6 * 3600000);
  });

  it("neveljavna ura vrne null", () => {
    expect(slotFromTemplate(new Date(2026, 7, 10), { ...predloga, startTime: "xx:yy" })).toBeNull();
  });
});
