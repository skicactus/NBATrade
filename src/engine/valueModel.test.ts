import { describe, expect, it } from "vitest";
import { ageMultiplier, marketValue, playerValue } from "./valueModel";
import type { Player } from "../types/player";

describe("marketValue", () => {
  it("increases with overall rating", () => {
    expect(marketValue(90)).toBeGreaterThan(marketValue(75));
    expect(marketValue(75)).toBeGreaterThan(marketValue(60));
  });

  it("never drops below the minimum-salary floor", () => {
    expect(marketValue(40)).toBe(1_100_000);
  });
});

describe("ageMultiplier", () => {
  it("favors younger players over an older peer of the same quality", () => {
    expect(ageMultiplier(20, 75)).toBeGreaterThan(ageMultiplier(30, 75));
  });

  it("discounts aging players even when they're still good right now", () => {
    expect(ageMultiplier(36, 85)).toBeLessThan(1);
  });

  it("stays within sane bounds for extreme inputs", () => {
    expect(ageMultiplier(17, 99)).toBeLessThanOrEqual(2.0);
    expect(ageMultiplier(45, 40)).toBeGreaterThanOrEqual(0.55);
  });

  it("gives a young, already-elite player a real upside premium over the plain age curve", () => {
    // Two 20-year-olds, same age: one playing like a star (Wemby/Flagg-type),
    // one a modest bench piece. The star should get a materially bigger
    // multiplier — the premium is for proven-early ceiling, not youth alone.
    const risingStar = ageMultiplier(20, 90);
    const youngReserve = ageMultiplier(20, 55);
    expect(risingStar).toBeGreaterThan(youngReserve * 1.15);
  });

  it("does not give a speculative bonus to a young player who isn't producing", () => {
    // A mediocre 19-year-old should land close to the plain age curve
    // (base only) rather than an inflated "potential" number.
    const base = 1 + (27 - 19) * 0.03;
    expect(ageMultiplier(19, 55)).toBeCloseTo(base, 5);
  });

  it("gives no upside premium to a young player once they age past the prime-youth window", () => {
    expect(ageMultiplier(27, 95)).toBeLessThan(ageMultiplier(24, 95));
  });
});

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "test",
    name: "Test Player",
    teamId: "SAS",
    position: "SF",
    age: 26,
    overall: 80,
    salary: 10_000_000,
    contractYearsLeft: 2,
    ...overrides,
  };
}

describe("playerValue", () => {
  it("gives an underpaid star positive value", () => {
    const star = makePlayer({ overall: 92, salary: 8_000_000, contractYearsLeft: 3 });
    expect(playerValue(star)).toBeGreaterThan(0);
  });

  it("gives an overpaid, declining player negative value", () => {
    const badContract = makePlayer({ overall: 62, salary: 35_000_000, age: 34, contractYearsLeft: 3 });
    expect(playerValue(badContract)).toBeLessThan(0);
  });

  it("weighs more remaining years more heavily, all else equal", () => {
    const shortDeal = makePlayer({ contractYearsLeft: 1 });
    const longDeal = makePlayer({ contractYearsLeft: 4 });
    expect(playerValue(longDeal)).toBeGreaterThan(playerValue(shortDeal));
  });

  it("values a young player already playing like a star above an identical prime-age one", () => {
    // Same overall, salary, and contract — only age differs. A teenage
    // franchise cornerstone (Cooper Flagg-type) should trade for more
    // than the same production from a player already in their prime,
    // because of the extra years of team control and ceiling.
    const youngRisingStar = makePlayer({ age: 19, overall: 81, salary: 14_500_000, contractYearsLeft: 4 });
    const primeAgeEquivalent = makePlayer({ age: 27, overall: 81, salary: 14_500_000, contractYearsLeft: 4 });
    expect(playerValue(youngRisingStar)).toBeGreaterThan(playerValue(primeAgeEquivalent));
  });
});
