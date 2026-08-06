import { describe, expect, it } from "vitest";
import { runGetRoster, runEvaluateTrade } from "./tools";

describe("runGetRoster", () => {
  it("returns the roster for a known team", () => {
    const result = JSON.parse(runGetRoster({ teamId: "SAS" }));
    expect(result.teamId).toBe("SAS");
    expect(Array.isArray(result.roster)).toBe(true);
    expect(result.roster.length).toBeGreaterThan(0);
  });

  it("returns an error for an unknown team", () => {
    const result = JSON.parse(runGetRoster({ teamId: "XXX" }));
    expect(result.error).toBeDefined();
  });
});

describe("runEvaluateTrade", () => {
  it("evaluates a trade between two known teams' players", () => {
    const sas = JSON.parse(runGetRoster({ teamId: "SAS" })).roster;
    const lal = JSON.parse(runGetRoster({ teamId: "LAL" })).roster;

    const result = JSON.parse(
      runEvaluateTrade({
        teamAId: "SAS",
        teamASendingPlayerIds: [sas[0].id],
        teamBId: "LAL",
        teamBSendingPlayerIds: [lal[0].id],
      }),
    );

    expect(typeof result.legal).toBe("boolean");
    expect(result.playersSentByA).toEqual([sas[0].name]);
    expect(result.playersSentByB).toEqual([lal[0].name]);
  });

  it("returns an error when a player id is not on the given roster", () => {
    const result = JSON.parse(
      runEvaluateTrade({
        teamAId: "SAS",
        teamASendingPlayerIds: ["not-a-real-id"],
        teamBId: "LAL",
        teamBSendingPlayerIds: [],
      }),
    );

    expect(result.error).toBeDefined();
    expect(result.missingA).toEqual(["not-a-real-id"]);
  });
});
