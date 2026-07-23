/** Formats a server-resolved minor-unit amount (paise/cents/pence —
 * `findPlanPricing`'s own real, chargeable figure, `@titan/platform`) as a
 * real localized currency string via the standard `Intl.NumberFormat` —
 * never a hand-rolled symbol table, which would need updating for every
 * new currency `SUPPORTED_CURRENCIES` ever grows to include. */
export function formatMinorUnits(amountMinorUnits: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
    amountMinorUnits / 100,
  );
}
