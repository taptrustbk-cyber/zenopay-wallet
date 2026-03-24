// lib/format.ts

/**
 * 🔥 Main function (USE THIS EVERYWHERE)
 * Convert:
 * 10000 → 10.000
 * 50000 → 50.000
 * 1000000 → 1.000.000
 * 10000.00 → 10.000
 */
export function formatIQD(value?: number | string | null): string {
  const num = Number(value || 0);

  if (isNaN(num)) return '0';

  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.floor(num));
}

/**
 * 🔥 With currency (optional)
 * 10000 → 10.000 IQD
 */
export function formatIQDWithCurrency(value?: number | string | null): string {
  return `${formatIQD(value)} IQD`;
}

/**
 * 🔥 Smart formatter (AUTO detect)
 * If currency = IQD → 10.000
 * If currency = USD → 10,000.00
 */
export function formatMoney(
  value?: number | string | null,
  currency: 'IQD' | 'USD' = 'IQD'
): string {
  const num = Number(value || 0);

  if (isNaN(num)) return '0';

  if (currency === 'IQD') {
    return formatIQD(num);
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * 🔥 Always number safe
 */
export function toNumber(value?: number | string | null): number {
  const num = Number(value || 0);
  return isNaN(num) ? 0 : num;
}
