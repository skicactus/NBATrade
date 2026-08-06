import { describe, expect, it } from "vitest";
import { findTradeTargets } from "./findTrades";
import type { Player } from "../types/player";

function makePlayer(overrides: Partial<Player>): Player {
  return {
    id: "id",
    name: "Player",
    teamId: "AAA",
    position: "SF",
    age: 26,
    overall: 75,
    salary: 8_000_000,
    contractYearsLeft: 2,
    ...overrides,
  };
}

// A small three-team league: my team has depth at SF, needs a PG.
// Team B has a well-paid, well-matched PG. Team C has a PG whose salary
// makes any legal package impossible from my thin roster.
const league: Player[] = [
  makePlayer({ id: "my-1", teamId: "MY", name: "My Wing One", position: "SF", salary: 9_000_000 }),
  makePlayer({ id: "my-2", teamId: "MY", name: "My Wing Two", position: "SG", salary: 4_000_000 }),
  makePlayer({ id: "my-3", teamId: "MY", name: "My Center", position: "C", salary: 12_000_000 }),

  makePlayer({ id: "b-pg", teamId: "B", name: "Target Guard", position: "PG", salary: 9_500_000, overall: 78 }),
  makePlayer({ id: "b-2", teamId: "B", name: "B Reserve", position: "PF", salary: 3_000_000 }),

  makePlayer({ id: "c-pg", teamId: "C", name: "Expensive Guard", position: "PG", salary: 45_000_000, overall: 90 }),
];

describe("findTradeTargets", () => {
  it("finds a legal candidate that gets the user a player at the requested position", () => {
    const results = findTradeTargets({ myTeamId: "MY", targetPosition: "PG" }, league);

    expect(results.length).toBeGreaterThan(0);
    for (const candidate of results) {
      expect(candidate.evaluation.legal).toBe(true);
      expect(candidate.receivingPlayerId).toBe("b-pg");
    }
  });

  it("never proposes a trade where the partner loses far more value than they gain", () => {
    const results = findTradeTargets({ myTeamId: "MY", targetPosition: "PG" }, league);

    for (const candidate of results) {
      const partnerNet = candidate.evaluation.teams[1].netValue;
      expect(partnerNet).toBeGreaterThanOrEqual(-5_000_000);
    }
  });

  it("excludes untouchable players from any proposed package", () => {
    const results = findTradeTargets(
      { myTeamId: "MY", targetPosition: "PG", excludePlayerIds: ["my-1"] },
      league,
    );

    for (const candidate of results) {
      expect(candidate.sendingPlayerIds).not.toContain("my-1");
    }
  });

  it("restricts the sending pool to eligibleSendingPositions when given", () => {
    const results = findTradeTargets(
      { myTeamId: "MY", targetPosition: "PG", eligibleSendingPositions: ["SF", "SG"] },
      league,
    );

    for (const candidate of results) {
      expect(candidate.sendingPlayerIds).not.toContain("my-3"); // the center
    }
  });

  it("ranks candidates by value gained for the requesting team", () => {
    const results = findTradeTargets({ myTeamId: "MY", targetPosition: "PG" }, league);

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].evaluation.teams[0].netValue).toBeGreaterThanOrEqual(
        results[i].evaluation.teams[0].netValue,
      );
    }
  });

  it("returns no candidates for a target so expensive no legal package exists", () => {
    const thinLeague = league.filter((p) => p.teamId !== "B"); // only the expensive guard remains
    const results = findTradeTargets({ myTeamId: "MY", targetPosition: "PG" }, thinLeague);
    expect(results).toEqual([]);
  });
});
