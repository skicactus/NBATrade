import { describe, expect, it } from "vitest";
import { evaluateTrade, type TradeProposal } from "./evaluateTrade";
import type { Player } from "../types/player";

function makePlayer(overrides: Partial<Player>): Player {
  return {
    id: "id",
    name: "Player",
    teamId: "SAS",
    position: "SF",
    age: 26,
    overall: 78,
    salary: 10_000_000,
    contractYearsLeft: 2,
    ...overrides,
  };
}

describe("evaluateTrade", () => {
  it("approves a roughly salary-matched trade between two under-cap teams", () => {
    const playerA = makePlayer({ id: "a", teamId: "SAS", salary: 12_000_000 });
    const playerB = makePlayer({ id: "b", teamId: "LAL", salary: 13_000_000 });

    const proposal: TradeProposal = {
      sides: [
        { teamId: "SAS", sending: [playerA], currentRoster: [playerA] },
        { teamId: "LAL", sending: [playerB], currentRoster: [playerB] },
      ],
    };

    const result = evaluateTrade(proposal);
    expect(result.legal).toBe(true);
  });

  it("rejects a trade where one team sends far less salary than it receives", () => {
    const cheapPlayer = makePlayer({ id: "a", teamId: "SAS", salary: 2_000_000 });
    const expensivePlayer = makePlayer({ id: "b", teamId: "LAL", salary: 30_000_000 });

    const proposal: TradeProposal = {
      sides: [
        { teamId: "SAS", sending: [cheapPlayer], currentRoster: [cheapPlayer] },
        { teamId: "LAL", sending: [expensivePlayer], currentRoster: [expensivePlayer] },
      ],
    };

    const result = evaluateTrade(proposal);
    expect(result.legal).toBe(false);
  });

  it("declares the team that gained more surplus value the winner", () => {
    const risingYoungStar = makePlayer({
      id: "a",
      teamId: "SAS",
      overall: 90,
      age: 22,
      salary: 9_000_000,
      contractYearsLeft: 3,
    });
    const decliningVet = makePlayer({
      id: "b",
      teamId: "LAL",
      overall: 68,
      age: 35,
      salary: 9_500_000,
      contractYearsLeft: 3,
    });

    const proposal: TradeProposal = {
      sides: [
        { teamId: "SAS", sending: [risingYoungStar], currentRoster: [risingYoungStar] },
        { teamId: "LAL", sending: [decliningVet], currentRoster: [decliningVet] },
      ],
    };

    const result = evaluateTrade(proposal);
    expect(result.legal).toBe(true);
    expect(result.winnerTeamId).toBe("LAL");
  });
});
