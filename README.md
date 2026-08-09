# Bazen Bar & BBQ — urnik in evidenca ur

Spletna aplikacija za vpisovanje delovnega časa in urejanje urnika izmen.
Nadomešča Google Sheets in dogovarjanje po WhatsAppu: zaposleni se s PIN-om
prijavi na izmeno, sam odda izmeno, ki je ne more opraviti, in vloži dopust;
vodje izmen urejajo urnik in potrjujejo prošnje; vodstvo ob koncu meseca
izvozi ure za obračun.

Deluje v brskalniku — na telefonu zaposlenega in na skupni tablici za šankom.
Nameščanje iz trgovine z aplikacijami ni potrebno.

## Kaj zna

**Evidenca ur**

- **Prijava s PIN-om** — izbereš svoje ime in vtipkaš 4-mestno kodo. Brez
  e-pošte in gesel. Po petih zaporednih napačnih poskusih se prijava za
  10 minut zaklene.
- **Ura** — en gumb za prijavo na izmeno in odjavo z nje, z odbitkom odmora.
- **Moje ure** — pregled vnosov po mesecih. Vodja lahko izbere osebo, popravi
  pozabljeno odjavo ali izbriše napačen vnos; popravek se zabeleži skupaj s
  tem, kdo ga je naredil.
- **Izvoz** — mesečni seštevek po osebah in prenos CSV (podpičje + UTF-8 BOM,
  torej se v slovenskem Excelu odpre pravilno).

**Urnik**

- Teden po dnevih; današnji dan je poudarjen. Zaposleni vidi razpored celotne
  ekipe, ureja pa ga le vodja. Izmene čez polnoč (20:00–02:00) so podprte.
- Vsak dan je razdeljen na **dopoldan / čez cel dan / popoldan**, znotraj vsakega
  pa je izpisano `ura · ime · delovno mesto` — torej se vidi tudi, **kje** kdo
  dela, ne le kdaj.
- **Privzete ure** za vsak del dneva se nastavijo enkrat (Nastavitve) in
  prednapolnijo vpis izmene; ure ostanejo popravljive.
- **Kopiraj urnik prejšnjega tedna** — en klik prepiše ves teden. Preskoči
  tiste z odobreno odsotnostjo in izmene, ki že obstajajo, zato dvojni klik
  urnika ne podvoji.
- Vpis izmene je zavrnjen, če se prekriva z že vpisano ali če ima oseba tisti
  dan odobreno odsotnost.

**Menjave izmen**

- Zaposleni svojo prihodnjo izmeno ponudi sodelavcem (»Ne morem — oddaj
  izmeno«).
- Sodelavec jo prevzame; sistem prepreči prevzem, če v tem času že dela ali je
  odsoten.
- Vodja potrdi in izmena se prepiše na novega nosilca. Vse v aplikaciji,
  namesto dogovarjanja v skupinskem klepetu.

**Odsotnosti**

- Vloga za dopust, bolniško ali drugo, z razponom datumov in razlogom.
- Vodja odobri ali zavrne, z neobvezno opombo. Ob odobritvi opozori, če ima ta
  oseba v tem obdobju že vpisane izmene.
- Odobrene odsotnosti so vidne v urniku.

**Razpoložljivost**

- Zaposleni za vsak dan označi **dopoldne in popoldne posebej**: *lahko delam /
  po dogovoru / ne morem*. Klik na polje kroži med stanji, brez tipkanja ur;
  hitre izbire (*Kadarkoli, Samo dopoldne, Samo popoldne, Samo vikend*) izpolnijo
  cel teden z enim klikom.
- Deli dneva so isti kot pri izmenah, zato jih **samodejni urnik dejansko
  upošteva**: kdor dopoldne ne more, ne dobi dopoldanske izmene, celodnevna pa
  zahteva razpoložljivost v obeh delih dneva.
- Vodja vidi mrežo cele ekipe po dnevih (zgornja vrstica dopoldne, spodnja
  popoldne). Če vpiše izmeno takrat, ko je nekdo označil »ne morem«, dobi
  opozorilo — izmena se vseeno vpiše, ker je razpoložljivost okvir, ne prepoved.
  Za konkretne dneve, ko koga ne bo, se uporabi **Odsotnosti**.

**Samodejno sestavljanje urnika**

- Vodstvo v **Nastavitve** določi delovna mesta (šank, kuhinja, strežba, bazen)
  in **predloge izmen**: za vsak dan v tednu del dneva in ure, koliko ljudi je
  potrebnih, najnižjo oceno za to mesto in po želji zahtevo »vsaj eden z
  oceno ≥ N«.
- Vsak zaposleni ima **oceno 0–5 po delovnem mestu** (0 = tega dela ne opravlja)
  in neobvezen **cilj ur na teden**.
- Gumb **Sestavi urnik iz predlog** v zavihku Urnik zapolni teden. Upošteva
  razpoložljivost, odobrene odsotnosti, ocene, prekrivanja in cilje ur.
- Prednost ima **pokritost izmen**: cilj ur je mehka omejitev — najprej so na
  vrsti tisti, ki cilja še niso dosegli, in šele če bi mesto sicer ostalo
  prazno, gre kdo čez cilj.
- Obstoječih izmen ne spreminja in jih ne podvaja, zato je gumb varno pritisniti
  večkrat. Mesta, ki jih ni bilo mogoče zapolniti, so izpisana poimensko.

**Dodatki na urno postavko**

- Dodatek za **dan v tednu** (npr. sobota in nedelja +1 €/h).
- Dodatek za **konkreten datum** (praznik ali naknadni dogovor), ki prevlada nad
  pravilom za dan v tednu.
- Dodatki se računajo ob izračunu, ne shranjujejo se k vnosu — zato jih je
  mogoče dodati **tudi za nazaj** in se pretekli meseci preračunajo sami.
- V izvozu so vidni ločeno: osnovna postavka, dodatek, postavka skupaj in bruto.

**Odbijanje ur za zamujanje** (privzeto izklopljeno)

- Zamuda se meri glede na začetek vpisane izmene. Vsak začeti blok nad
  toleranco pomeni en odbitek — pri privzetih nastavitvah 1–15 min zamude
  pomeni uro, 16–30 min dve uri, 31–45 min tri ure.
- Blok, odbitek in tolerance so nastavljivi; stran sproti pokaže, kaj trenutne
  nastavitve pomenijo.
- Odbitek se izračuna ob prijavi in **zapiše k vnosu**, zato poznejša sprememba
  nastavitev ne spremeni že obračunanih ur. Vodja ga lahko pri posameznem vnosu
  popravi.
- Odtegljaji od plače so v Sloveniji pravno omejeni (ZDR-1). Funkcija je zato
  privzeto izklopljena — vklopi jo vodstvo v **Nastavitve**.

**Za vodje**

- **Za urediti** na začetni strani zbere vse, kar čaka: pozabljene odjave
  (odprt vnos, starejši od 14 ur), vloge za odsotnost in menjave za potrditev.
- **Danes v lokalu** pokaže, kdo je trenutno na izmeni in kakšen je razpored.
- Vodja izmene ne more odobriti svoje lastne vloge ali menjave, v kateri je
  udeležen — to potrdi vodstvo.

## Vloge

| Vloga | Sme |
| --- | --- |
| Zaposlen/a | prijava/odjava na uro, svoj urnik, svoje ure, oddaja in prevzem izmen, vloge za odsotnost, razpoložljivost, sprememba svojega PIN-a |
| Vodja izmene | vse zgoraj + urejanje urnika za vse, popravki ur, potrjevanje odsotnosti in menjav, pregled razpoložljivosti ekipe, izvoz |
| Vodstvo | vse zgoraj + dodajanje/urejanje zaposlenih, vloge, urne postavke, ocene po delovnih mestih, cilji ur, delovna mesta in predloge izmen, dodatki, nastavitve zamud, ponastavitev PIN-a, odločanje o vlogah vodij |

## Namestitev na telefon

Aplikacija je PWA — na domači zaslon se doda brez trgovine z aplikacijami.

- **Android (Chrome):** meni ⋮ → *Dodaj na začetni zaslon*
- **iPhone (Safari):** gumb za deljenje → *Dodaj na začetni zaslon*

Odpre se čez cel zaslon, brez naslovne vrstice brskalnika.

## Zagon na svojem računalniku

Potrebuješ Node.js 20 ali novejši. Na Windowsu kliči `npm.cmd` in `npx.cmd` —
politika izvajanja skript sicer blokira `npm.ps1`.

```bash
npm install
```

Ustvari `.env` po vzoru `.env.example`: vpiši oba povezovalna niza do baze
(v Supabase pod **Connect**) in svoj `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Pripravi bazo in prvi račun vodstva:

```bash
npx prisma migrate deploy
npm run db:seed
```

Zaženi:

```bash
npm run dev
```

Aplikacija teče na <http://localhost:3100>. (Port 3000 na tem računalniku
zaseda drug Docker vsebnik, zato 3100.)

Prvi PIN izpiše `npm run db:seed` — po prvi prijavi ga zamenjaj na začetni
strani pod »Spremeni svoj PIN«, nato v zavihku **Ekipa** dodaj sodelavce.

### Preizkus na telefonu

Telefon mora biti v isti wifi mreži; odpri naslov, ki ga `npm run dev` izpiše
pod **Network** (npr. `http://192.168.3.7:3100`). Naslovi IPv4 tega računalnika
se samodejno dodajo v `allowedDevOrigins` — brez tega Next.js v razvoju blokira
svoje datoteke in stran se naloži brez JavaScripta (vidiš vsebino, klik pa ne
naredi ničesar).

### Uporabne komande

| Komanda | Kaj naredi |
| --- | --- |
| `npm run dev` | razvojni strežnik na portu 3100 |
| `npm run build` | produkcijska gradnja in preverjanje tipov |
| `npm test` | testi nad računanjem časa, odbitkov, dodatkov in urnika |
| `npm run db:studio` | brskanje po bazi v brskalniku |
| `npm run db:seed` | prvi račun vodstva (če je baza prazna) |
| `npx prisma migrate dev --name opis` | nova migracija po spremembi sheme |
| `npx prisma generate` | osveži odjemalec po spremembi sheme |

## Kako je narejeno

- **Next.js 16** (App Router, strežniške akcije) — vmesnik in strežniška logika
  v enem projektu.
- **Prisma 7** nad **PostgreSQL** (Supabase). Aplikacija se povezuje prek
  pooler ja (`DATABASE_URL`, vrata 6543), migracije pa prek neposredne povezave
  (`DIRECT_URL`, vrata 5432) — pooler v transakcijskem načinu za spreminjanje
  sheme ni primeren.
- **Seja** je podpisan JWT v `httpOnly` piškotku, veljaven 12 ur (ena izmena).
- **PIN** je shranjen kot bcrypt hash — iz baze ga ni mogoče prebrati.

```
src/
  app/
    prijava/         prijavni zaslon s PIN tipkovnico
    (app)/           zaščiteni del aplikacije
      page.tsx       ura, »za urediti«, danes v lokalu
      urnik/         tedenski urnik, kopiranje tedna, oddaja izmen
      menjave/       ponujene izmene, prevzemi, potrditve
      odsotnosti/    vloge za dopust in bolniško
      razpolozljivost/ tedenska razpoložljivost in mreža ekipe
      ure/           mesečni pregled ur in popravki
      izvoz/         seštevki in CSV
      zaposleni/     ekipa (samo vodstvo)
      nastavitve/    dodatki na postavko in odbijanje ur (samo vodstvo)
    api/izvoz/       CSV za obračun
    manifest.ts      podatki za namestitev na telefon
    icon.tsx         ikona aplikacije
  lib/
    actions/         strežniške akcije (pisanje v bazo)
    session.ts       seja in preverjanje pravic
    approvals.ts     kdo sme odločati o kateri vlogi
    parts-of-day.ts  deli dneva in njihove privzete ure
    pay.ts           dodatki na urno postavko
    lateness.ts      izračun odbitka za zamudo
    scheduler.ts     sestavljanje urnika (čista funkcija, brez baze)
    time.ts          računanje in izpis ur
prisma/
  schema.prisma      podatkovni model
  seed.ts            prvi račun vodstva
```

### Čas

Vsi trenutki so v bazi shranjeni v UTC, prikaz in razvrščanje po dnevih pa sta
v času lokala (`Europe/Ljubljana`). Časovni pas strežnika na to **ne vpliva** —
gostitelji tečejo v UTC in bi sicer kazali napačne ure. Vsa pretvorba je v
[src/lib/time.ts](src/lib/time.ts); v strežniški kodi ne uporabljaj `getHours`,
`setHours` ali `new Date("…T16:00")`.

### Dogovori, ki jih je dobro poznati

- Izmena čez polnoč šteje k dnevu, ko se je **začela** — tudi v mesečnem
  seštevku.
- Odobrena odsotnost ne izbriše že vpisanih izmen; vodja dobi opozorilo in jih
  prerazporedi sam.
- Izmene, ki še tečejo (brez odjave), niso vštete v izvoz.
- Dodatek na postavko se določi po dnevu, ko se je izmena **začela**.
- Če je odbitek za zamudo večji od opravljenega časa, se ure ustavijo pri nič —
  v minus ne gredo.

## Objava na splet

Baza je že na Supabase, aplikacija pa še teče na računalniku. Ostane:

1. ~~Zamenjati bazo za PostgreSQL~~ — narejeno.
2. **Objaviti na Vercel** (brezplačni nivo) — poveži GitHub repozitorij in
   nastavi spremenljivke okolja `DATABASE_URL`, `DIRECT_URL` in `AUTH_SECRET`.
3. **Na gostitelju uporabi nov `AUTH_SECRET`**, ne istega kot lokalno.

Migracije se na novo bazo prenesejo z:

```bash
npx.cmd prisma migrate deploy
```

### Začasen prikaz brez objave

Za hiter prikaz (npr. vodstvu) ni treba odpirati vrat na usmerjevalniku:

```bash
cloudflared tunnel --url http://localhost:3100
```

Dobiš začasen naslov HTTPS, ki neha delovati, ko tunel ustaviš.

### Preden gre v resnično uporabo

Evidenca delovnega časa je podlaga za obračun plač, zato velja pred vpeljavo
premisliti še:

- **Varnostna kopija baze.** Supabase in Neon delata samodejne kopije; pri
  SQLite je to kopiranje datoteke `prisma/dev.db`.
- **Hramba podatkov.** Evidenco delovnega časa je treba po ZEPDSV hraniti
  trajno; vnosov zato ne brišimo po nepotrebnem (zaposlenega raje označimo kot
  neaktivnega).
- **4-mestni PIN** je primeren za uro v lokalu, ne pa za dostop z interneta brez
  omejitev. Zaklep po petih poskusih je vgrajen; ob objavi na splet razmisli še
  o omejitvi po IP-ju.
