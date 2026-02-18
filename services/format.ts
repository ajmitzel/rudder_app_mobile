export function formatAmount(amount?: number | null): string {
  if (amount == null || Number.isNaN(amount)) {
    return 'Unknown total';
  }
  const rounded = Math.round(amount * 100) / 100;
  if (Number.isInteger(rounded)) {
    return `$${rounded}`;
  }
  return `$${rounded.toFixed(2)}`;
}
