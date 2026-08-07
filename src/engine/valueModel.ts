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

// Two effects stacked: a plain age curve (young players are worth more
// per dollar of surplus since they have more years before decline; old
// players are worth less even if they're producing well right now), plus
// an extra "cornerstone" premium for players who are both young AND
// already performing at a starter-or-better level — a 19-year-old
// already playing like a plus starter is a fundamentally different asset
// than a 19-year-old bench piece, and real front offices pay for that
// ceiling, not just the current box score. A young player with a modest
// overall gets the plain age curve only — no speculative bonus for
// youth alone, since that would inflate every young reserve.
export function ageMultiplier(age: number, overall: number): number {
  const base = 1 + (27 - age) * 0.03;
  const primeYouth = Math.max(0, (25 - age) / 8);
  const qualitySignal = Math.max(0, (overall - 60) / 40);
  const upsidePremium = primeYouth * qualitySignal * 0.9;
  return Math.min(2.0, Math.max(0.55, base + upsidePremium));
}

export function playerValue(player: Player): number {
  const surplusPerYear = marketValue(player.overall) - player.salary;

  let totalSurplus = 0;
  for (let year = 0; year < player.contractYearsLeft; year++) {
    totalSurplus += surplusPerYear * YEAR_DISCOUNT ** year;
  }

  return totalSurplus * ageMultiplier(player.age, player.overall);
}
