import type { Player } from "../types/player";

const YEAR_DISCOUNT = 0.85;

// Trade value is modeled as "surplus value": the gap between what a player's
// production is worth on the open market and what they actually earn,
// compounded over their remaining contract (discounted per future year for
// risk), then adjusted for age since surplus on a young player is worth more
// than the same surplus on a player in decline.
export function marketValue(overall: number): number {
  const scaled = Math.max(0, overall - 50) / 45;
  return Math.max(1_100_000, scaled ** 2 * 55_000_000);
}

export function ageMultiplier(age: number): number {
  const raw = 1 + (26 - age) * 0.02;
  return Math.min(1.3, Math.max(0.65, raw));
}

export function playerValue(player: Player): number {
  const surplusPerYear = marketValue(player.overall) - player.salary;

  let totalSurplus = 0;
  for (let year = 0; year < player.contractYearsLeft; year++) {
    totalSurplus += surplusPerYear * YEAR_DISCOUNT ** year;
  }

  return totalSurplus * ageMultiplier(player.age);
}
