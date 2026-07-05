// lib/format.ts
// SwedBank — Swedish Krona (SEK) formatting helpers.
// Swedish number format uses space as thousands separator and comma as decimal.

/**
 * Format a number using Swedish locale (space thousands, comma decimal).
 * 10000 → "10 000"
 * 10000.5 → "10 000,50"
 */
export function formatSEK(value?: number | string | null): string {
  const num = Number(value || 0);

  if (isNaN(num)) return '0';

  return new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format with SEK currency symbol (kr), Swedish style.
 * 10000 → "10 000 kr"
 */
export function formatSEKWithCurrency(value?: number | string | null): string {
  const num = Number(value || 0);

  if (isNaN(num)) return '0 kr';

  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Smart formatter — AUTO detect currency.
 * If currency = SEK → "10 000 kr"
 * If currency = EUR → "10 000,00 €"
 * If currency = USD → "10,000.00 $"
 */
export function formatMoney(
  value?: number | string | null,
  currency: 'SEK' | 'EUR' | 'USD' = 'SEK'
): string {
  const num = Number(value || 0);

  if (isNaN(num)) return '0';

  if (currency === 'SEK') {
    return formatSEK(num);
  }

  if (currency === 'EUR') {
    return new Intl.NumberFormat('sv-SE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Always number safe
 */
export function toNumber(value?: number | string | null): number {
  const num = Number(value || 0);
  return isNaN(num) ? 0 : num;
}

/**
 * Format an IBAN for display (grouped in 4-char chunks).
 * SE45 5000 0000 0583 9825 7466 → "SE45 5000 0000 0583 9825 7466"
 */
export function formatIBAN(iban?: string | null): string {
  const clean = String(iban || '')
    .replace(/\s+/g, '')
    .toUpperCase();
  if (!clean) return '';
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Mask an IBAN for display (show country + first 2 + last 4).
 * SE45 5000...57466 → "SE45 •••• •••• •••• 5746"
 */
export function maskIBAN(iban?: string | null): string {
  const clean = String(iban || '')
    .replace(/\s+/g, '')
    .toUpperCase();
  if (!clean || clean.length < 8) return clean || '';
  const head = clean.slice(0, 4);
  const tail = clean.slice(-4);
  const masked = '•••• •••• ••••';
  return `${head} ${masked} ${tail}`;
}
