/** Zneski v evrih, vedno na dve decimalki in z vejico. */
export function formatEuro(amount: number): string {
  return `${amount.toFixed(2).replace(".", ",")} €`;
}

/**
 * Slovenska sklanjatev ob števniku: 1 vnos, 2 vnosa, 3 vnosi, 5 vnosov.
 * Oblike se podajo v tem vrstnem redu (ednina, dvojina, 3–4, množina).
 */
export function plural(
  count: number,
  forms: [string, string, string, string],
): string {
  const remainder = Math.abs(count) % 100;
  if (remainder === 1) return `${count} ${forms[0]}`;
  if (remainder === 2) return `${count} ${forms[1]}`;
  if (remainder === 3 || remainder === 4) return `${count} ${forms[2]}`;
  return `${count} ${forms[3]}`;
}
