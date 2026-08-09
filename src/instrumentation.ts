/**
 * Časovni pas strežnika.
 *
 * Aplikacija povsod računa in izpisuje čas v lokalnem času procesa: urnik,
 * meje tedna in meseca, dan v tednu, del dneva in izvoz za obračun. Gostitelji
 * (Vercel) privzeto tečejo v UTC, zato bi bili prikazani časi poleti dve uri
 * prezgodnji, izmena čez polnoč pa bi padla na napačen dan.
 *
 * `register()` se izvede enkrat ob zagonu strežnika in zaključi, preden ta
 * začne streči zahteve, zato je to najzgodnejša točka, kjer je pas mogoče
 * nastaviti za celoten proces.
 *
 * Če je pas nastavljen že v okolju, ga pustimo pri miru — tako ga je mogoče
 * povoziti brez spremembe kode.
 */
const DEFAULT_TIME_ZONE = "Europe/Ljubljana";

export function register(): void {
  if (!process.env.TZ) {
    process.env.TZ = DEFAULT_TIME_ZONE;
  }
}
