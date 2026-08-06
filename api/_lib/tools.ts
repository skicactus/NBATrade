import type { Anthropic } from "@anthropic-ai/sdk";
import { teams } from "../../src/data/teams";
import { players } from "../../src/data/players";
import { evaluateTrade } from "../../src/engine/evaluateTrade";
import type { Player } from "../../src/types/player";

export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: "get_roster",
    description:
      "Get the current roster for an NBA team, including each player's id, name, position, overall rating, salary, and years left on their contract. Use this to look up player ids by name before calling evaluate_trade.",
    input_schema: {
      type: "object",
      properties: {
        teamId: {
          type: "string",
          description: 'Team abbreviation, e.g. "LAL", "BOS", "SAS".',
        },
      },
      required: ["teamId"],
    },
  },
  {
    name: "evaluate_trade",
    description:
      "Deterministically check whether a proposed two-team trade is salary-cap legal, and compute which team gains more surplus trade value. Always call this before telling the user whether a trade is legal or who wins it — never estimate cap legality or value yourself.",
    input_schema: {
      type: "object",
      properties: {
        teamAId: { type: "string", description: "Abbreviation of the first team." },
        teamASendingPlayerIds: {
          type: "array",
          items: { type: "string" },
          description: "Player ids (from get_roster) that team A sends away.",
        },
        teamBId: { type: "string", description: "Abbreviation of the second team." },
        teamBSendingPlayerIds: {
          type: "array",
          items: { type: "string" },
          description: "Player ids (from get_roster) that team B sends away.",
        },
      },
      required: ["teamAId", "teamASendingPlayerIds", "teamBId", "teamBSendingPlayerIds"],
    },
  },
];

function rosterFor(teamId: string): Player[] {
  return players.filter((p) => p.teamId === teamId);
}

export function runGetRoster(input: { teamId: string }): string {
  const team = teams.find((t) => t.id === input.teamId);
  if (!team) {
    return JSON.stringify({ error: `Unknown teamId "${input.teamId}". Valid ids are the 30 NBA team abbreviations.` });
  }

  const roster = rosterFor(input.teamId).map((p) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    age: p.age,
    overall: p.overall,
    salary: p.salary,
    contractYearsLeft: p.contractYearsLeft,
  }));

  return JSON.stringify({ team: `${team.city} ${team.name}`, teamId: team.id, roster });
}

export function runEvaluateTrade(input: {
  teamAId: string;
  teamASendingPlayerIds: string[];
  teamBId: string;
  teamBSendingPlayerIds: string[];
}): string {
  const rosterA = rosterFor(input.teamAId);
  const rosterB = rosterFor(input.teamBId);

  const sendingA = rosterA.filter((p) => input.teamASendingPlayerIds.includes(p.id));
  const sendingB = rosterB.filter((p) => input.teamBSendingPlayerIds.includes(p.id));

  const missingA = input.teamASendingPlayerIds.filter((id) => !sendingA.some((p) => p.id === id));
  const missingB = input.teamBSendingPlayerIds.filter((id) => !sendingB.some((p) => p.id === id));
  if (missingA.length > 0 || missingB.length > 0) {
    return JSON.stringify({
      error: "Some player ids were not found on the given team's roster. Call get_roster again to confirm ids.",
      missingA,
      missingB,
    });
  }

  const result = evaluateTrade({
    sides: [
      { teamId: input.teamAId, sending: sendingA, currentRoster: rosterA },
      { teamId: input.teamBId, sending: sendingB, currentRoster: rosterB },
    ],
  });

  return JSON.stringify({
    ...result,
    playersSentByA: sendingA.map((p) => p.name),
    playersSentByB: sendingB.map((p) => p.name),
  });
}

export function runTool(name: string, input: unknown): string {
  switch (name) {
    case "get_roster":
      return runGetRoster(input as { teamId: string });
    case "evaluate_trade":
      return runEvaluateTrade(
        input as {
          teamAId: string;
          teamASendingPlayerIds: string[];
          teamBId: string;
          teamBSendingPlayerIds: string[];
        },
      );
    default:
      return JSON.stringify({ error: `Unknown tool "${name}".` });
  }
}
