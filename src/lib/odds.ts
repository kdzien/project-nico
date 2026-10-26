export function roundOdds(value: number): number {
  return Math.round(value * 100) / 100;
}

export function doubleChance(first: number | null, draw: number | null): number | null {
  if (first === null || draw === null || first <= 1 || draw <= 1) return null;
  return roundOdds(1 / (1 / first + 1 / draw));
}
