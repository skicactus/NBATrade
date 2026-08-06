import { describe, expect, it } from "vitest";
import { runGetRoster, runEvaluateTrade, runFindTradeTargets, runCheckCapValidity } from "./tools";

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

describe("runCheckCapValidity", () => {
  it("checks a single team's cap math for a specific exchange", () => {
    const sas = JSON.parse(runGetRoster({ teamId: "SAS" })).roster;
    const lal = JSON.parse(runGetRoster({ teamId: "LAL" })).roster;

    const result = JSON.parse(
      runCheckCapValidity({
        teamId: "SAS",
        outgoingPlayerIds: [sas[0].id],
        incomingPlayerIds: [lal[0].id],
      }),
    );

    expect(result.team).toBe("San Antonio Spurs");
    expect(typeof result.legal).toBe("boolean");
    expect(result.outgoingPlayers).toEqual([sas[0].name]);
    expect(result.incomingPlayers).toEqual([lal[0].name]);
  });

  it("agrees with evaluate_trade on legality for the same exchange", () => {
    const sas = JSON.parse(runGetRoster({ teamId: "SAS" })).roster;
    const lal = JSON.parse(runGetRoster({ teamId: "LAL" })).roster;

    const capCheck = JSON.parse(
      runCheckCapValidity({ teamId: "SAS", outgoingPlayerIds: [sas[0].id], incomingPlayerIds: [lal[0].id] }),
    );
    const tradeEval = JSON.parse(
      runEvaluateTrade({
        teamAId: "SAS",
        teamASendingPlayerIds: [sas[0].id],
        teamBId: "LAL",
        teamBSendingPlayerIds: [lal[0].id],
      }),
    );

    expect(capCheck.legal).toBe(tradeEval.teams[0].capCheck.legal);
  });

  it("returns an error for an unknown team", () => {
    const result = JSON.parse(runCheckCapValidity({ teamId: "XXX", outgoingPlayerIds: [], incomingPlayerIds: [] }));
    expect(result.error).toBeDefined();
  });

  it("returns an error when an outgoing player isn't on that team's roster", () => {
    const lal = JSON.parse(runGetRoster({ teamId: "LAL" })).roster;
    const result = JSON.parse(
      runCheckCapValidity({ teamId: "SAS", outgoingPlayerIds: [lal[0].id], incomingPlayerIds: [] }),
    );
    expect(result.error).toBeDefined();
    expect(result.missingOutgoing).toEqual([lal[0].id]);
  });
});

describe("runFindTradeTargets", () => {
  it("returns candidates with resolved team and player names", () => {
    const result = JSON.parse(runFindTradeTargets({ myTeamId: "SAS" }));
    expect(result.myTeam).toBe("San Antonio Spurs");
    expect(Array.isArray(result.candidates)).toBe(true);
    for (const candidate of result.candidates) {
      expect(candidate.partnerTeam).not.toBe(candidate.partnerTeamId);
      expect(typeof candidate.legal).toBe("boolean");
    }
  });

  it("returns an error for an unknown team", () => {
    const result = JSON.parse(runFindTradeTargets({ myTeamId: "XXX" }));
    expect(result.error).toBeDefined();
  });
});
