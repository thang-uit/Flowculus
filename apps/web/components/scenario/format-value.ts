/** Two-decimal read-out with a unit suffix, or the empty placeholder. */
export const formatValue = (
  value: number | null | undefined,
  suffix = '',
  emptyValue = 'N/A',
) => (value == null ? emptyValue : `${Number(value.toFixed(2))}${suffix}`);
