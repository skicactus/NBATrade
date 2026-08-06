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
  it("favors younger players over the age-26 baseline", () => {
    expect(ageMultiplier(20)).toBeGreaterThan(ageMultiplier(26));
  });

  it("discounts older players below the age-26 baseline", () => {
    expect(ageMultiplier(35)).toBeLessThan(ageMultiplier(26));
  });

  it("stays within sane bounds for extreme ages", () => {
    expect(ageMultiplier(19)).toBeLessThanOrEqual(1.3);
    expect(ageMultiplier(45)).toBeGreaterThanOrEqual(0.65);
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
});
