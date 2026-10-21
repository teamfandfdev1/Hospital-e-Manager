export const USD_TO_NGN_RATE = 1330;
export const NAIRA_SYMBOL = '₦';

/**
 * Formats a monetary number in Nigerian Naira (₦).
 * Uses standard Nigerian locale formatting with the ₦ sign.
 */
export function formatNaira(amount: number | null | undefined, showDecimals: boolean = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showDecimals ? '₦0.00' : '₦0';
  }

  // Format with standard thousands separators
  const parts = Number(amount).toFixed(showDecimals ? 2 : 0).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  if (showDecimals && parts[1] !== undefined) {
    return `₦${integerPart}.${parts[1]}`;
  }
  return `₦${integerPart}`;
}

/**
 * Formats large amounts compactly (e.g. ₦2.4M, ₦850K).
 */
export function formatNairaCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₦0';
  }

  const absAmount = Math.abs(amount);
  if (absAmount >= 1_000_000) {
    return `₦${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (absAmount >= 10_000) {
    return `₦${(amount / 1_000).toFixed(1)}K`;
  }
  return formatNaira(amount, false);
}
