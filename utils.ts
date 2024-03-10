export function notNull<T>(value: T | null | undefined): value is T {
  return value != null;
}

export const printPercentage = (percentage: number) => {
  return (percentage * 100).toFixed(2) + "%";
};
