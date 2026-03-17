// lib/format.ts

/**
 * Format number to Iraqi style:
 * 10000 → 10.000
 * 1000000 → 1.000.000
 * No decimals (.00 removed)
 */
export function formatIQD(value?: number | string | null): string {
  const num = Number(value || 0);

  if (isNaN(num)) return '0';

  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format with currency text
 * 10000 → 10.000 IQD
 */
export function formatIQDWithCurrency(value?: number | string | null): string {
  return `${formatIQD(value)} IQD`;
}

/**
 * Remove decimals ONLY (10000.00 → 10000)
 */
export function removeDecimals(value?: number | string | null): number {
  return Math.floor(Number(value || 0));
}

/**
 * Safe number parse
 */
export function toNumber(value?: number | string | null): number {
  const num = Number(value || 0);
  return isNaN(num) ? 0 : num;
}
