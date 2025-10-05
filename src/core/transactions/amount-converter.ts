/**
 * Utility functions for converting between dollars and cents.
 * Actual Budget API uses integer cents for all amounts.
 */

/**
 * Convert dollar amount to cents (integer)
 *
 * @param amount - Amount in dollars
 * @returns Amount in cents (rounded to nearest integer)
 */
export function convertToCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert cents to dollar amount
 *
 * @param cents - Amount in cents
 * @returns Amount in dollars
 */
export function convertFromCents(cents: number): number {
  return cents / 100;
}
