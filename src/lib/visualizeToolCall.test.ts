import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import { visualizeEvaluateTrade, visualizeFindTradeTargets, visualizeToolCall } from "./visualizeToolCall";

const sasPlayers = players.filter((p) => p.teamId === "SAS");
const lalPlayers = players.filter((p) => p.teamId === "LAL");

describe("visualizeEvaluateTrade", () => {
  it("resolves a valid evaluate_trade tool call into graph-ready data", () => {
    const v = visualizeEvaluateTrade({
      teamAId: "SAS",
      teamASendingPlayerIds: [sasPlayers[0].id],
      teamBId: "LAL",
      teamBSendingPlayerIds: [lalPlayers[0].id],
    });

    expect(v).not.toBeNull();
    expect(v?.teamA.id).toBe("SAS");
    expect(v?.teamB.id).toBe("LAL");
    expect(v?.sendingA).toHaveLength(1);
    expect(v?.sendingB).toHaveLength(1);
    expect(typeof v?.evaluation.legal).toBe("boolean");
  });

  it("returns null for an unknown team id", () => {
    expect(visualizeEvaluateTrade({ teamAId: "XXX", teamASendingPlayerIds: ["a"], teamBId: "LAL", teamBSendingPlayerIds: ["b"] })).toBeNull();
  });

  it("returns null for a malformed/hallucinated input", () => {
    expect(visualizeEvaluateTrade({ teamAId: "SAS" })).toBeNull();
    expect(visualizeEvaluateTrade(null)).toBeNull();
  });

  it("returns null when a player id doesn't exist", () => {
    const v = visualizeEvaluateTrade({
      teamAId: "SAS",
      teamASendingPlayerIds: ["not-a-real-id"],
      teamBId: "LAL",
      teamBSendingPlayerIds: [lalPlayers[0].id],
    });
    expect(v).toBeNull();
  });
});

describe("visualizeFindTradeTargets", () => {
  it("resolves candidates into graph-ready data with labels", () => {
    const results = visualizeFindTradeTargets({ myTeamId: "SAS" });
    for (const v of results) {
      expect(v.teamA.id).toBe("SAS");
      expect(v.sendingB).toHaveLength(1);
      expect(v.label).toContain("Option");
    }
  });

  it("returns an empty array for an unknown team", () => {
    expect(visualizeFindTradeTargets({ myTeamId: "XXX" })).toEqual([]);
  });
});

describe("visualizeToolCall", () => {
  it("dispatches to the right resolver by tool name", () => {
    const evalResult = visualizeToolCall("evaluate_trade", {
      teamAId: "SAS",
      teamASendingPlayerIds: [sasPlayers[0].id],
      teamBId: "LAL",
      teamBSendingPlayerIds: [lalPlayers[0].id],
    });
    expect(evalResult).toHaveLength(1);

    const findResult = visualizeToolCall("find_trade_targets", { myTeamId: "SAS" });
    expect(Array.isArray(findResult)).toBe(true);

    expect(visualizeToolCall("get_roster", { teamId: "SAS" })).toEqual([]);
  });
});
