# Bazen Bar & BBQ — urnik in evidenca ur

Spletna aplikacija za vpisovanje delovnega časa in urejanje urnika izmen.
Nadomešča Google Sheets: zaposleni se s PIN-om prijavi na izmeno, vodje izmen
urejajo urnik in popravljajo napake, vodstvo ob koncu meseca izvozi ure za
obračun.

Deluje v brskalniku — na telefonu zaposlenega in na skupni tablici za šankom.
Nameščanje iz trgovine z aplikacijami ni potrebno.

## Kaj zna

- **Prijava s PIN-om** — izbereš svoje ime in vtipkaš 4-mestno kodo. Brez
  e-pošte in gesel. Po petih zaporednih napačnih poskusih se prijava za
  10 minut zaklene.
- **Ura** — en gumb za prijavo na izmeno in odjavo z nje, z odbitkom odmora.
- **Urnik** — teden po dnevih. Zaposleni vidi svoje izmene, vodja vidi in ureja
  vse. Izmene čez polnoč (20:00–02:00) so podprte.
- **Moje ure** — pregled vnosov po mesecih. Vodja lahko izbere osebo, popravi
  pozabljeno odjavo ali izbriše napačen vnos; popravek se zabeleži skupaj s
  tem, kdo ga je naredil.
- **Izvoz** — mesečni seštevek po osebah in prenos CSV (podpičje + UTF-8 BOM,
  torej se v slovenskem Excelu odpre pravilno).

## Vloge

| Vloga | Sme |
| --- | --- |
| Zaposlen/a | prijava/odjava na uro, svoj urnik, svoje ure, sprememba svojega PIN-a |
| Vodja izmene | vse zgoraj + urejanje urnika za vse, popravki ur, izvoz |
| Vodstvo | vse zgoraj + dodajanje/urejanje zaposlenih, vloge, urne postavke, ponastavitev PIN-a |

## Zagon na svojem računalniku

Potrebuješ Node.js 20 ali novejši.

```bash
npm install
```

Ustvari `.env` po vzoru `.env.example` (ali kopiraj obstoječega) in vanj vpiši
svoj `AUTH_SECRET`:

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

### Uporabne komande

| Komanda | Kaj naredi |
| --- | --- |
| `npm run dev` | razvojni strežnik na portu 3100 |
| `npm run build` | produkcijska gradnja |
| `npm run db:studio` | brskanje po bazi v brskalniku |
| `npm run db:seed` | prvi račun vodstva (če je baza prazna) |
| `npx prisma migrate dev --name opis` | nova migracija po spremembi sheme |

## Kako je narejeno

- **Next.js 16** (App Router, strežniške akcije) — vmesnik in strežniška logika
  v enem projektu.
- **Prisma 7** nad **SQLite** v razvoju; datoteka baze je `prisma/dev.db` in ni
  v gitu.
- **Seja** je podpisan JWT v `httpOnly` piškotku, veljaven 12 ur (ena izmena).
- **PIN** je shranjen kot bcrypt hash — iz baze ga ni mogoče prebrati.

```
src/
  app/
    prijava/         prijavni zaslon s PIN tipkovnico
    (app)/           zaščiteni del: ura, urnik, ure, izvoz, ekipa
    api/izvoz/       CSV za obračun
  lib/
    actions/         strežniške akcije (pisanje v bazo)
    session.ts       seja in preverjanje pravic
    time.ts          računanje in izpis ur
prisma/
  schema.prisma      podatkovni model
  seed.ts            prvi račun vodstva
```

## Objava na splet

Dokler teče lokalno, je aplikacija dosegljiva samo v lokalu. Za dostop
zaposlenih od doma je treba:

1. **Zamenjati bazo za PostgreSQL.** V `prisma/schema.prisma` nastavi
   `provider = "postgresql"`, namesti `@prisma/adapter-pg`, v `src/lib/prisma.ts`
   zamenjaj adapter in v `DATABASE_URL` vpiši povezovalni niz (Supabase ali Neon
   imata brezplačen nivo, ki za 30 zaposlenih zadošča). Shema je napisana tako,
   da drugih sprememb ni potrebnih.
2. **Nastaviti `AUTH_SECRET`** na gostitelju — nov, naključen, ne isti kot
   lokalno.
3. **Objaviti na Vercel** (brezplačni nivo) — poveži GitHub repozitorij,
   nastavi obe spremenljivki okolja, zaženi `npx prisma migrate deploy`.

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
