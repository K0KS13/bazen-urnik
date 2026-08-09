# HANDOFF — Bazen Bar & BBQ, urnik in evidenca delovnega časa

Dokument je namenjen razvijalcu ali agentnemu okolju, ki prevzema projekt.
Stanje je preverjeno na dan **9. 8. 2026**, commit `8ac8215`, veja `main`.

Kjer česa iz kode ni bilo mogoče zanesljivo ugotoviti, je to označeno z
**NEPREVERJENO**.

---

## 1. Kaj je aplikacija

Spletna aplikacija za gostinski lokal **Bazen Bar & BBQ**. Nadomešča Google
Sheets za urnik in evidenco ur ter dogovarjanje o menjavah izmen po WhatsAppu.

Uporabniki: **20 zaposlenih** (predvideno 16–30), več vodij izmen, eno vodstvo.
Uporablja se na telefonih zaposlenih in na skupni napravi v lokalu.

Vsa vsebina — vmesnik, komentarji v kodi, sporočila commitov — je v
**slovenščini**. Nadaljuj enako.

**Ure iz te aplikacije so podlaga za obračun plač.** Vsaka napaka v računanju
časa pomeni napačno izplačilo; temu ustrezno previdno.

---

## 2. Trenutno stanje

**V produkciji in v uporabi.**

| | |
|---|---|
| Produkcija | https://bazen-urnik.vercel.app |
| Repozitorij | https://github.com/K0KS13/bazen-urnik (zaseben) |
| Baza | Supabase PostgreSQL 17, projekt `hazkmselekkupckdhydd`, regija `aws-0-eu-central-1` |
| Objava | samodejna ob `git push` na `main` |
| Lastnik | Jaka Kokalj (GitHub `K0KS13`) |

Preverjeno na produkciji: nalaganje, prijava s PIN-om, obstojnost seje,
skrbniške strani, zapisovanje (prijava na izmeno).

### Vsebina baze ob predaji

```
zaposleni: 20   (admin=3, manager=1, employee=16), vsi aktivni
delovna mesta: 3
ocene po delovnih mestih: 3   ← samo pri enem zaposlenem
predloge izmen: 42
razpoložljivost: 14 vrstic    ← samo pri enem zaposlenem
izmene: 0
vnosi ur: 1
odsotnosti: 1
pravila dodatkov: 2
zaprti dnevi: 1
nastavitve: odbijanje ur VKLOPLJENO (blok 15 min, odbitek 60 min)
```

Posledica: **samodejni urnik trenutno v praksi ne dela nič uporabnega**, ker
ima ocene po delovnih mestih vpisane le en zaposleni. Glej NEXT STEPS.

---

## 3. Tehnologije

| Paket | Verzija | Opomba |
|---|---|---|
| next | 16.3.0 | App Router, strežniške akcije, Turbopack |
| react / react-dom | 19.2.8 | |
| prisma / @prisma/client | ^7.9.1 | generator `prisma-client` (ne `prisma-client-js`) |
| @prisma/adapter-pg | ^7.9.1 | Prisma 7 zahteva driver adapter |
| jose | ^6.2.8 | podpisovanje sejnega JWT |
| bcryptjs | ^3.0.3 | zgoščevanje PIN-ov, 10 rund |
| tailwindcss | ^4 | prek `@tailwindcss/postcss` |
| typescript | ^5 | strict |
| tsx | ^4.23.11 | zagon skript `.ts` |
| dotenv | ^17.4.2 | bere `.env` v `prisma.config.ts` |
| vitest | ^4.1.10 | testi nad čistimi funkcijami |
| Node.js | 24.19.0 lokalno | Next 16 zahteva ≥ 20 |

Zunanje knjižnice za delo s časom **ni** — vse opravi `src/lib/time.ts` prek
vgrajenega `Intl`.

> **Pozor pri Next.js 16.** V `AGENTS.md` (zapiše ga `next dev`) piše, da se ta
> različica razlikuje od starejših. Dokumentacija je v
> `node_modules/next/dist/docs/`. Preberi jo, preden uporabiš API, ki ga ne
> poznaš iz starejših različic.

---

## 4. Zagon lokalno

Windows: kliči **`npm.cmd`** in **`npx.cmd`**, ne `npm`/`npx` — privzeta
politika izvajanja skript blokira `npm.ps1`.

```bash
npm.cmd install
```

Ustvari `.env` po vzoru `.env.example` (glej razdelek 5), nato:

```bash
npx.cmd prisma migrate deploy
```

```bash
npx.cmd prisma generate
```

```bash
npm.cmd run dev
```

Teče na **http://localhost:3100**. Port 3000 na razvojnem računalniku zaseda
Docker vsebnik `koks-api`; zasedeni so tudi 8080, 80 in 3306.

### Skripte

| Ukaz | Kaj naredi |
|---|---|
| `npm.cmd run dev` | razvojni strežnik, port 3100 |
| `npm.cmd run build` | `prisma migrate deploy && prisma generate && next build` |
| `npm.cmd start` | produkcijski strežnik, port 3100 |
| `npm.cmd run lint` | ESLint |
| `npm.cmd test` | vitest, enkraten zagon (65 testov) |
| `npm.cmd run test:watch` | vitest v načinu opazovanja |
| `npm.cmd run db:studio` | Prisma Studio |
| `npm.cmd run db:seed` | prvi račun vodstva, **le če je baza prazna** |

`npm run build` se pred gradnjo **poveže na bazo** (migrate deploy). Brez
veljavnega `DIRECT_URL` gradnja pade — to je namerno, da shema ne zaostane za
kodo.

### Preizkus na telefonu

Telefon v isti wifi mreži odpre naslov, ki ga `npm run dev` izpiše pod
**Network**. `next.config.ts` samodejno doda vse IPv4 naslove računalnika v
`allowedDevOrigins`; brez tega Next v razvoju blokira svoje datoteke in stran
se naloži brez JavaScripta (vidiš vsebino, klik ne naredi nič).

---

## 5. Spremenljivke okolja

Datoteka `.env` **ni** in ne sme biti v gitu (`.gitignore` ima `.env*`).
Skrivnosti niso navedene v tem dokumentu.

| Ime | Namen |
|---|---|
| `DATABASE_URL` | aplikacija; Supabase pooler, **vrata 6543**, `?pgbouncer=true` |
| `DIRECT_URL` | migracije; neposredna povezava, **vrata 5432** |
| `AUTH_SECRET` | podpisovanje sejnih JWT; naključnih 32 bajtov |
| `TZ` | **`Europe/Ljubljana`** — glej razdelek 12.1 |
| `SEED_ADMIN_PIN` | neobvezno, samo za `db:seed` (privzeto `2468`) |

Ločitev poolerja in neposredne povezave je nujna: pooler v transakcijskem
načinu ne podpira spreminjanja sheme. Nastavljena je v `prisma.config.ts`
(`url: DIRECT_URL ?? DATABASE_URL`) in v `src/lib/prisma.ts` (`DATABASE_URL`).

Nov `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

**NEPREVERJENO:** ali ima Vercel drug `AUTH_SECRET` kot lokalno okolje in ali
je bilo geslo baze po predaji zamenjano (bilo je enkrat izpostavljeno v
klepetu). Oboje preveri in po potrebi zamenjaj.

---

## 6. Struktura projekta

```
prisma/
  schema.prisma            podatkovni model
  seed.ts                  prvi račun vodstva (samo če je baza prazna)
  migrations/              3 migracije, glej razdelek 7
prisma.config.ts           Prisma 7 konfiguracija (datasource = DIRECT_URL)
next.config.ts             allowedDevOrigins iz lokalnih IPv4 naslovov
src/
  app/
    layout.tsx             korenska postavitev, metapodatki, PWA
    globals.css            Tailwind v4 + paleta + gradniki (.card, .btn-*, .field)
    manifest.ts            PWA manifest
    icon.tsx               ikona 512×512 (ImageResponse)
    apple-icon.tsx         ikona 180×180 za iOS
    prijava/
      page.tsx             seznam zaposlenih (strežniška komponenta)
      login-form.tsx       PIN tipkovnica (odjemalec)
    (app)/                 zaščiten del; layout kliče requireUser()
      layout.tsx           glava, navigacija, značka čakajočih menjav
      page.tsx             Ura: prijava/odjava, "za urediti", danes v lokalu
      urnik/page.tsx       tedenski urnik, generator, kopiranje, vpis izmen
      menjave/page.tsx     ponudbe izmen, prevzemi, potrditve
      odsotnosti/page.tsx  vloge za dopust/bolniško
      razpolozljivost/     tedenska razpoložljivost + mreža ekipe
      ure/page.tsx         mesečni pregled ur, popravki
      izvoz/page.tsx       mesečni seštevki + povezava na CSV
      zaposleni/page.tsx   ekipa, vloge, postavke, ocene (samo admin)
      nastavitve/page.tsx  delovna mesta, predloge, zaprti dnevi,
                           privzete ure, dodatki, odbijanje ur (samo admin)
    api/izvoz/route.ts     GET, CSV za obračun (edini HTTP endpoint)
  components/              odjemalske komponente (glej razdelek 11)
  lib/
    actions/               strežniške akcije, ena datoteka na področje
    prisma.ts              odjemalec + adapter, singleton
    session.ts             seja, requireUser/requireScheduleManager/requireAdmin
    roles.ts               vloge in pravice
    approvals.ts           kdo sme odločati o kateri vlogi
    scheduler.ts           razporejevalnik (ČISTA funkcija, brez baze)
    time.ts                računanje in izpis časa
    pay.ts                 dodatki na urno postavko
    lateness.ts            odbitek za zamudo
    parts-of-day.ts        deli dneva + privzete ure
    availability.ts        statusi razpoložljivosti, dnevi v tednu
    closed-days.ts         zaprti dnevi
    requests.ts            vrste odsotnosti, oznake stanj
    format.ts              evri, slovenska sklanjatev števnikov
    settings.ts            enovrstična tabela nastavitev
  generated/prisma/        generiran odjemalec — NI v gitu
```

`public/` vsebuje privzete SVG datoteke iz `create-next-app`, ki se **ne
uporabljajo**. Lahko se pobrišejo.

---

## 7. Podatkovna baza

PostgreSQL. Migracije v `prisma/migrations/`:

1. `20260809144313_init` — celotna shema
2. `20260809152856_zaprti_dnevi` — tabela `ClosedDay`
3. `20260809160000_razpolozljivost_po_delih_dneva` — `Availability` po delih
   dneva; vsebuje tudi `INSERT ... SELECT`, ki obstoječe vrstice podvoji za
   popoldan

Modeli (podrobnosti in komentarji so v `prisma/schema.prisma`):

| Model | Vloga |
|---|---|
| `Employee` | zaposleni, `pinHash`, vloga, `hourlyRate`, `weeklyHoursTarget`, `active` |
| `Shift` | načrtovana izmena; `partOfDay`, `position` (besedilo) + `positionId` |
| `TimeEntry` | dejanski čas; `clockIn/clockOut`, `breakMinutes`, `lateMinutes`, `penaltyMinutes`, `shiftId`, sled popravka |
| `Position` | šifrant delovnih mest |
| `EmployeeSkill` | ocena 0–5 na (zaposleni, delovno mesto) |
| `ShiftTemplate` | prednastavljena izmena na (dan v tednu, delovno mesto) |
| `Availability` | (zaposleni, dan, dopoldan/popoldan) → yes/maybe/no |
| `PayRule` | dodatek €/h za dan v tednu ali konkreten datum |
| `ClosedDay` | zaprt dan v tednu ali datum |
| `Settings` | enovrstična; odbijanje ur + privzete ure delov dneva |
| `Absence` | vloga za dopust/bolniško + odločitev |
| `ShiftOffer` | oddaja izmene: open → claimed → approved/rejected |

**Nizi namesto enumov.** Shema je namenoma brez enumov (dediščina prehoda s
SQLite). Dovoljene vrednosti so definirane v `src/lib/*` in preverjane v
akcijah, **baza jih ne uveljavlja**. Če dodajaš vrednost, jo dodaj v pripadajoč
`const` seznam in v `is*` preveritveno funkcijo.

Brisanje: `Employee` kaskadno briše izmene, vnose ur, ocene, razpoložljivost,
odsotnosti in oddane ponudbe. `createdById` / `editedById` / `decidedById` se
ob brisanju postavijo na `null` (`SetNull`).

---

## 8. API in zunanje integracije

**Edini HTTP endpoint:** `GET /api/izvoz?leto=<YYYY>&mesec=<1-12>`

- Vrne CSV za obračun; ločilo je podpičje, kodiranje UTF-8 z BOM (slovenski
  Excel).
- Stolpci: Priimek, Ime, Datum, Prijava, Odjava, Odmor (min), Zamuda (min),
  Odbitek (min), Ure (decimalno), Osnovna postavka, Dodatek na uro, Postavka
  skupaj, Bruto, Opomba.
- Dostop: samo `manager` ali `admin`; sicer **403**. Neveljavno obdobje **400**.
- Vključi samo zaključene vnose (`clockOut != null`).

Vse ostalo teče prek **strežniških akcij** (`"use server"`), ne prek REST-a.

**Zunanjih integracij ni** — ni e-pošte, obvestil, plačil, analitike.
Edine zunanje storitve so Supabase (baza) in Vercel (gostovanje).

---

## 9. Avtentikacija in avtorizacija

**Prijava:** izbereš svoje ime s seznama aktivnih zaposlenih in vtipkaš
4-mestni PIN. Brez e-pošte in gesel.

- PIN je shranjen kot **bcrypt** hash (10 rund).
- Po **5 neuspelih poskusih** se račun za **10 minut** zaklene.
  Števci so **v pomnilniku procesa** (`Map` v `src/lib/actions/auth.ts`) —
  ob ponovnem zagonu se ponastavijo in **ne delujejo pravilno pri več
  instancah**. Na Vercelu je to realna omejitev.
- PIN ne sme biti štirikrat ista števka, `1234` ali `0123`.

**Seja:** podpisan JWT (HS256, `jose`) v piškotku `bazen_seja`,
`httpOnly`, `sameSite: lax`, veljavnost **12 ur** (ena izmena).

Zastavica `Secure` se postavi **samo, kadar je zahteva prišla po HTTPS**
(`x-forwarded-proto`). To je namerno: brskalniki `Secure` piškotek prek
navadnega HTTP zavržejo, kar je pri dostopu prek omrežnega naslova
(`http://192.168.x.x:3100`) pomenilo, da se prijava posreči, seja pa ne
shrani, in prvi klik je uporabnika vrnil na prijavo.

**Vloge** (`src/lib/roles.ts`):

| Vloga | Sme |
|---|---|
| `employee` | ura, svoj urnik, svoje ure, oddaja/prevzem izmen, odsotnosti, razpoložljivost, svoj PIN |
| `manager` | + urejanje urnika, popravki ur, potrjevanje odsotnosti in menjav, izvoz |
| `admin` | + zaposleni, vloge, postavke, ocene, delovna mesta, predloge, nastavitve |

**Uveljavljanje:** `src/lib/session.ts` — `requireUser()`,
`requireScheduleManager()`, `requireAdmin()`. Kliče jih `(app)/layout.tsx`
**in vsaka stran posebej**, poleg tega še vsaka strežniška akcija.
**Middleware ne obstaja** — zaščita je izključno v teh klicih. Če dodaš novo
stran ali akcijo, moraš klic dodati sam.

**Načelo:** vodja izmene ne odloča o vlogi, v kateri je sam udeležen; o tem
odloča vodstvo. Uveljavljeno dvakrat — v akcijah in v poizvedbah prek
`src/lib/approvals.ts`, da se take vloge sploh ne prikažejo med čakajočimi.

---

## 10. Implementirane funkcionalnosti

Vse spodaj je **narejeno in preizkušeno**. Ne izdeluj znova.

### Evidenca ur
- Prijava/odjava na izmeno z odbitkom odmora.
- Ob prijavi se poišče **najbližja načrtovana izmena** (±6 h) in izračuna
  zamuda ter odbitek; oboje se **zapiše k vnosu**, da poznejša sprememba
  nastavitev ne spremeni že obračunanih ur.
- Mesečni pregled; vodja lahko popravi čas, odmor, odbitek in opombo ali vnos
  izbriše. Popravek zabeleži, kdo in kdaj ga je naredil.

### Urnik
- Tedenski pogled, razdeljen na **dopoldan / čez cel dan / popoldan**, znotraj
  vsakega `ura · ime · delovno mesto`.
- Vpis izmene zavrne prekrivanje in odobreno odsotnost; opozori pri
  neujemanju z razpoložljivostjo in pri zaprtem dnevu.
- Izmene čez polnoč (konec ≤ začetek) se končajo naslednji dan.
- **Kopiraj urnik prejšnjega tedna** — preskoči zaprte dneve, odsotnosti in
  obstoječe izmene; ponoven klik ne podvoji.
- **Samodejno sestavljanje iz predlog** — glej razdelek 11.

### Menjave izmen
Zaposleni ponudi svojo prihodnjo izmeno → sodelavec jo prevzame (zavrnjeno ob
prekrivanju ali odobreni odsotnosti) → vodja potrdi in izmena se v transakciji
prepiše na novega nosilca.

### Odsotnosti
Vloga za dopust/bolniško/drugo z razponom datumov; vodja odobri ali zavrne z
opombo. Ob odobritvi opozori, če ima oseba v tem obdobju vpisane izmene
(izmen **ne** briše). Odobrene odsotnosti so vidne v urniku in preprečijo vpis
izmene tisti dan.

### Razpoložljivost
Za vsak dan **ločeno dopoldne in popoldne**: lahko / po dogovoru / ne morem.
Klik na polje kroži med stanji; hitre izbire (*Kadarkoli, Samo dopoldne, Samo
popoldne, Samo vikend*) izpolnijo cel teden. Vodja vidi mrežo cele ekipe.

### Plače in odbitki
- Dodatek €/h za **dan v tednu** ali **konkreten datum** (datum prevlada).
  Računa se ob izračunu, ne shranjuje k vnosu — zato velja **tudi za nazaj**.
- Odbijanje ur za zamude: vsak začeti blok nad toleranco je en odbitek
  (privzeto 1–15 min → 1 h, 16–30 min → 2 h …). Nastavljivo, privzeto
  izklopljeno — **v produkciji je trenutno vklopljeno**.

### Ostalo
- **PWA**: manifest + ikone, dodajanje na domači zaslon, `display: standalone`.
- **Za urediti** (vodje): pozabljene odjave (odprt vnos > 14 h), čakajoče
  vloge in menjave.
- **Danes v lokalu**: kdo je trenutno na izmeni + razpored za danes.
- **Zaprti dnevi**: vsak tak dan v tednu ali posamezen datum.

---

## 11. Kako delujejo ključni deli

### Razporejevalnik — `src/lib/scheduler.ts`

**Čista funkcija brez dostopa do baze.** `buildSchedule(slots, candidates)`
vrne dodelitve in nepokrita mesta. Podatke pripravi
`src/lib/actions/scheduler.ts`. Ta ločitev je namerna, ker je logiko tako
mogoče preveriti brez baze — izkoristi jo.

Vrstni red:

1. Mesta se uredijo po **najmanjšem številu ustreznih kandidatov** — najbolj
   omejena prva, sicer jih zasedejo ljudje, ki bi jih drugod lažje nadomestili.
2. Kandidat je ustrezen, če ima oceno ≥ `minLevel`, ni označen »ne morem«, ni
   odsoten in se termin ne prekriva z že dodeljenim.
3. Za vsako mesto se najprej izbira med tistimi, ki **tedenskega cilja ur še
   niso dosegli**; če bi mesto sicer ostalo prazno, se seže tudi čez cilj.
   Cilj ur je torej **mehka** omejitev — prednost ima pokritost.
4. Če je `leadLevel` nastavljen in izkušenega še ni med izbranimi, mora
   zadnje prosto mesto zapolniti kdo s to oceno.
5. Razvrstitev: zanesljivo na voljo pred »po dogovoru« → večji primanjkljaj do
   cilja → višja ocena → ime (da je izid predvidljiv).

**Celodnevna izmena zahteva razpoložljivost dopoldne IN popoldne**; velja
slabši od obeh statusov (`partsRequiredFor`).

Obstoječih izmen ne spreminja in jih ne podvaja — gumb je varno pritisniti
večkrat.

### Deli dneva — `src/lib/parts-of-day.ts`
`dopoldan | celodnevna | popoldan`. Privzete ure vsakega so v `Settings` in
prednapolnijo vpis izmene. Izmene, vpisane pred to možnostjo, nimajo
`partOfDay`; zanje se izpelje iz začetne ure in trajanja (`derivePartOfDay`).

Razpoložljivost pozna samo `dopoldan | popoldan` (`AVAILABILITY_PARTS`).

### Obrazci — `src/components/action-form.tsx`
Ovoj okoli strežniške akcije: onemogoči polja med izvajanjem in izpiše odgovor.

**`resetKey` je pomemben.** Če obrazec prikazuje shranjeno stanje (izbirniki,
potrditvena polja), mu podaj `resetKey` — podpis teh podatkov. Brez tega React
po oddaji poljem povrne vrednost, ki so jo imela ob priklopu, in videti je, kot
da se ni nič shranilo. Ključ je na `fieldset`, ne na obrazcu, da se pri tem ne
izgubi izpisani odgovor strežnika. Ta napaka je bila že enkrat odpravljena; ne
uvedi je znova.

### `Collapsible` — `src/components/collapsible.tsx`
Nadomešča `<details open={pogoj}>`. Navaden `<details>` z izračunanim `open` se
po oddaji obrazca zapre, ker se pogoj medtem spremeni, s tem pa izgine tudi
odgovor strežnika. Uporabljaj ta gradnik.

### Druge odjemalske komponente
`live-clock.tsx` (ura prek `useSyncExternalStore`, ne `setState` v učinku),
`availability-grid.tsx`, `weekday-picker.tsx`, `part-of-day-times.tsx`,
`month-picker.tsx`, `nav-link.tsx`.

### Čas — `src/lib/time.ts`
`workedMinutes = (odjava − prijava) − odmor − odbitek`, nikoli pod 0.
`isoWeekday` je 1 = ponedeljek … 7 = nedelja (ne `Date.getDay()`).

---

## 12. Znane napake in nedokončano

### 12.1 Časovni pas — **ODPRAVLJENO 9. 8. 2026**

Zgodovina, ker je pomembna za razumevanje `time.ts`: vsa oblikovanja in
razvrščanja časa so uporabljala **lokalni čas procesa**, Vercel pa teče v UTC.
Izmena, shranjena kot `18:00Z` (v Ljubljani 20:00), se je na produkciji
izpisala kot `18:00–21:00`. Napačne so bile tudi meje tedna in meseca, dan v
tednu za izmene čez polnoč in izpeljan del dneva.

Poskus, da bi pas nastavili ob zagonu (`instrumentation.ts` →
`process.env.TZ`), **ni zalegel** — Next.js izrisuje v ločenih delovnih
procesih, ki te nastavitve ne dobijo. Ta pristop je bil odstranjen; ne
poskušaj ga znova.

Rešitev: `src/lib/time.ts` čas izrecno razstavlja in sestavlja v pasu lokala
prek `Intl` s `timeZone`, zato pas procesa nanj ne vpliva. Pas je v
`APP_TIME_ZONE` (namenoma **ne** `TZ`, da ga okolje ne more tiho povoziti),
privzeto `Europe/Ljubljana`.

Preverjeno na produkciji po objavi: ista izmena se zdaj izpiše kot
`20:00–23:00`.

> **Pozor:** v strežniški kodi ne uporabljaj `getHours`, `setHours`, `getDay`,
> `getDate`, `toDateString` ali `toLocaleTimeString` brez `timeZone`, prav tako
> ne `new Date("2026-08-10T16:00")`. Uporabi `zonedParts`, `zonedDate`,
> `parseLocalDate`, `parseLocalDateTime`, `startOfDay`, `addDays`, `isoWeekday`
> in `isSameDay` iz `src/lib/time.ts`. Testi tečejo v UTC in tako odvisnost
> takoj odkrijejo. Izjema je `live-clock.tsx`, ki teče v brskalniku in namenoma
> uporablja čas naprave.

### 12.2 Zaklep po neuspelih prijavah ne deluje zanesljivo
Števci so v pomnilniku procesa. Na Vercelu (več instanc, hladni zagoni) se
ponastavijo. Za pravo omejevanje je treba stanje preseliti v bazo ali Redis.

### 12.3 Samodejni urnik še nima podatkov
Ocene po delovnih mestih ima vpisane **en zaposleni od dvajsetih**. Brez ocen
`minLevel` nikogar ne prepusti. Ni napaka v kodi, je manjkajoč vnos podatkov.
Vnos je odslej hiter — tabela **Ocene celotne ekipe** v zavihku Ekipa shrani
vse naenkrat.

### 12.4 Testi pokrivajo le čiste funkcije
Obstaja 65 testov (`npm.cmd test`) nad `scheduler.ts`, `lateness.ts`, `pay.ts`
in `time.ts`. **Ni** testov za strežniške akcije, dostopne pravice in
vmesnik — te je treba še vedno preveriti ročno.

### 12.5 Datoteke se na razvojnem računalniku kvarijo
Trikrat je datoteka postala niz ničelnih bajtov ali presledkov:
`prisma/migrations/migration_lock.toml`, `refs/remotes/origin/main`, in
`prisma/migrations/20260809152856_zaprti_dnevi/migration.sql` — zadnja je bila
v pokvarjenem stanju celo commitana in objavljena. Vse je obnovljeno.
**Vzrok ni znan (NEPREVERJENO)** — sum na protivirusni program ali disk.
Po vsakem `git push` preveri, da so migracije še berljive.

### 12.6 Manjše
- Predlog izmen in izmen **ni mogoče urejati** — samo izbrisati in vpisati
  znova.
- `prisma/seed.ts` ustvari račun z imenom »Jaka (vodstvo)«, ki v bazi ne
  obstaja več (preimenovan). Skripta deluje le, če je baza prazna.
- Izvoz ne vključuje izmen, ki še tečejo (brez odjave) — namerno, a vodja mora
  na to paziti ob koncu meseca.

### 12.7 Nepojasnjeno
Med razvojem so dvakrat izginile vpisane izmene, ne da bi jih brisala koda, ki
je bila takrat pognana. Najverjetneje jih je izbrisal uporabnik prek vmesnika,
**a to ni potrjeno (NEPREVERJENO)**. Če se ponovi, poglej `Shift` in kaskade
ob brisanju `Employee`.

---

## 13. Arhitekturne odločitve

| Odločitev | Zakaj |
|---|---|
| Strežniške akcije namesto REST | ena koda, brez ločenega API sloja; edini endpoint je CSV, ker mora vrniti datoteko |
| PIN namesto gesel | uporaba na skupni napravi v lokalu; hitrost je pomembnejša od moči gesla |
| Razporejevalnik kot čista funkcija | preverljivost brez baze |
| Zamuda in odbitek se **zapišeta** k vnosu | poznejša sprememba pravil ne sme spremeniti že obračunanih ur |
| Dodatki na postavko se **računajo** ob izračunu | omogoča vpis za nazaj |
| `Shift.position` kot besedilo **in** `positionId` | izmena ostane berljiva, če se šifrant spremeni |
| Nizi namesto enumov | dediščina prehoda s SQLite; prenosljivost sheme |
| Razpoložljivost je opozorilo, ne prepoved | za trdo odsotnost obstajajo Odsotnosti |
| Deaktivacija namesto brisanja zaposlenih | evidenca ur je podlaga za plače |

---

## 14. Gradnja in objava

**Razvoj:** `npm.cmd run dev` → port 3100.

**Produkcija lokalno:** `npm.cmd run build`, nato `npm.cmd start`. Pred
gradnjo ustavi tekoči strežnik, sicer se lahko zaleti ob odprte datoteke.

**Vercel:** projekt `bazen-urnik`, ekipa `bazen`, preset Next.js, root `./`.
Vsak `push` na `main` sproži objavo. Gradnja požene `prisma migrate deploy`,
zato se shema baze posodobi sama.

**Začasen prikaz brez objave** (npr. vodstvu), brez odpiranja vrat na
usmerjevalniku:

```bash
cloudflared tunnel --url http://localhost:3100
```

---

## 15. Testiranje

```bash
npm.cmd test
```

**65 testov** v `tests/`, vsi nad čistimi funkcijami, brez baze in brez mreže:

| Datoteka | Kaj pokriva |
|---|---|
| `tests/timezone.test.ts` | čas lokala neodvisno od pasu procesa, poletni in zimski čas, oba prehoda, meje dneva/tedna/meseca, razčlenjevanje vnosa, izpeljava dela dneva |
| `tests/time.test.ts` | opravljene minute, izmene čez polnoč, meje tedna in meseca, izpis ur |
| `tests/lateness.test.ts` | dogovorjena lestvica odbitkov, tolerance, robni primeri |
| `tests/pay.test.ts` | dodatki po dnevu v tednu in po datumu, prevlada datuma, izračun bruto |
| `tests/scheduler.test.ts` | razpoložljivost po delih dneva, ocene, zahteva po izkušenem, odsotnosti, prekrivanja, cilj ur, izmene čez polnoč |

> **Testi namenoma tečejo v `TZ=UTC`** (`vitest.config.mts`), gostitelji pa tudi.
> Če se v kodo prikrade odvisnost od časovnega pasu procesa, testi za čas
> lokala odpovejo. Te nastavitve ne spreminjaj.

**Ni pokrito:** strežniške akcije, dostopne pravice, vmesnik, delo z bazo.
Za to je treba še vedno ročno preverjanje.

Ob predaji je bilo ročno preverjeno:

- prijava (pravilen in napačen PIN, obstojnost seje) — lokalno, prek omrežnega
  naslova in na produkciji;
- ura: prijava/odjava, zavrnitev odmora, daljšega od izmene;
- zamuda 41 min → odbitek 180 min (blok 15 min, odbitek 60 min);
- vikend dodatek 7,50 h × 11,00 € = 82,50 €; datumski dodatek za nazaj
  preračuna isti vnos na 93,75 €;
- menjava izmene: oddaja → prevzem → potrditev → prepis nosilca;
- odsotnost: vloga, odobritev, blokada vpisa izmene tisti dan;
- kopiranje tedna, vključno z drugim klikom (brez podvajanja);
- zaprt dan: prikaz in preskok pri generatorju;
- razporejevalnik: 6 primerov razpoložljivosti po delih dneva (dopoldan,
  popoldan, celodnevna, prednost »lahko« pred »po dogovoru«, prazen vnos).

Ti ročni primeri so odslej zajeti v testih, razen tistih, ki zahtevajo bazo
(menjave, odsotnosti, kopiranje tedna, zaprti dnevi).

---

## 16. Na kaj mora biti naslednji razvijalec pozoren

1. **Baza je produkcijska.** Lokalni razvoj se povezuje na isto Supabase bazo
   kot produkcija. Ni ločenega razvojnega okolja. Vsak testni zapis konča med
   pravimi podatki. Do ločene baze delaj s testnimi računi, ki jih je mogoče
   prepoznati in pobrisati.
2. **Ure so plače.** Spremembe v `time.ts`, `lateness.ts` in `pay.ts` preveri
   izračunsko, ne le vizualno.
3. **Odbijanje ur je pravno občutljivo.** Odtegljaji od plače so v Sloveniji
   po ZDR-1 omejeni. Funkcija je v produkciji **vklopljena**; preveri, ali je
   dogovorjena z zaposlenimi.
4. **Osebni podatki.** Ure in postavke 20 zaposlenih so osebni podatki.
   Pravna podlaga in evidenca obdelav **NEPREVERJENO**.
5. Novo stran ali akcijo **vedno** začni z ustreznim `require*` klicem —
   middlewara ni.
6. Na Windowsu `npm.cmd` / `npx.cmd`.
7. Ne poganjaj `npx prisma init` — prepisal bi obstoječo nastavitev.
8. Slovenščina povsod: vmesnik, komentarji, sporočila commitov. Za sklanjatev
   števnikov uporabi `plural()` iz `src/lib/format.ts`.

---

## 17. Tehnični dolg

| Dolg | Predlog |
|---|---|
| Zaklep prijave v pomnilniku | prestavi v bazo |
| Testi ne pokrivajo akcij in pravic | dodaj teste nad akcijami s testno bazo |
| Nizi namesto enumov | ob naslednji večji migraciji razmisli o enumih |
| Ni urejanja predlog in izmen | dodaj urejanje namesto brisanja |
| Ni ločenega razvojnega okolja | drugi Supabase projekt za razvoj |
| Poizvedbe v zankah | `copyPreviousWeekAction` in generator delata poizvedbe v zanki; pri 30 ljudeh je to sprejemljivo, pri rasti ne |

---

## NEXT STEPS

Razvrščeno po prioriteti glede na dejansko stanje.

### 1. Vnesi ocene po delovnih mestih za vso ekipo — **danes**
19 od 20 zaposlenih nima ocen, zato samodejni urnik ne razporedi nikogar.
Brez tega je največja funkcija aplikacije mrtva. Vnos je v zavihku Ekipa,
razdelek **Ocene celotne ekipe** — cela tabela se shrani naenkrat.

### 2. Preveri obračun za tekoči mesec
Časovni pas je bil popravljen 9. 8. 2026. Vnosi ur, nastali **pred** tem, so v
bazi shranjeni pravilno (UTC), zato jih popravek le pravilneje prikaže — a
mesečni seštevki, ki so bili morda že izvoženi, so bili napačni. Preveri
izvoz za tekoči in prejšnji mesec.

### 3. Razreši protislovje ponedeljkov
V bazi je 42 predlog izmen in 1 zaprt dan. Preveri, ali se ne izključujeta —
predloge za dan, ki je označen kot zaprt, ne dajo nobene izmene.

### 4. Preveri skrivnosti
Geslo baze je bilo enkrat izpostavljeno. Zamenjaj ga v Supabase ter posodobi
`.env` in Vercel. Prepričaj se, da ima produkcija drug `AUTH_SECRET` kot
lokalno okolje.

### 5. Zaklep prijave prestavi iz pomnilnika v bazo
Zdaj se števci neuspelih poskusov na Vercelu ponastavijo ob vsakem hladnem
zagonu, zato omejitev petih poskusov v praksi ne drži. Pri 4-mestnem PIN-u je
to edina zaščita pred ugibanjem.

### 6. Obvestila
Brez njih zaposleni ne bodo sami odpirali aplikacije. Aplikacija je PWA, zato
so možna spletna potisna obvestila; alternativa je e-pošta prek zunanje
storitve. Sprožilci: objavljen urnik, ponujena izmena, odločitev o vlogi.

### 7. Osnutek urnika pred objavo
Zdaj je vsaka vpisana izmena takoj vidna vsem. Vodje sestavljajo teden
postopoma — smiselno je stanje `osnutek` → `objavljen`.

### 8. Varnostna kopija in hramba
Preveri, kaj Supabase na brezplačnem nivoju dejansko hrani in kako dolgo.
Evidenco delovnega časa je treba po ZEPDSV hraniti trajno.

### 9. Ločeno razvojno okolje
Drugi Supabase projekt, da razvoj ne piše v produkcijsko bazo.

### 10. Urejanje predlog in izmen
Trenutno le brisanje in ponoven vpis.
