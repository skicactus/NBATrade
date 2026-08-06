import type { Anthropic } from "@anthropic-ai/sdk";
import { teams } from "../../src/data/teams";
import { players } from "../../src/data/players";
import { evaluateTrade } from "../../src/engine/evaluateTrade";
import { findTradeTargets, type FindTradesRequest } from "../../src/engine/findTrades";
import { checkSalaryMatch } from "../../src/engine/capRules";
import type { Player, Position } from "../../src/types/player";

const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];

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
    name: "check_cap_validity",
    description:
      "Deterministically check the salary-matching legality of what ONE team would send out vs. take back in a trade, given that team's current payroll. Use this for a quick isolated cap-math question about a single team (e.g. \"could the Bulls take back this much salary?\") without needing full player rosters on both sides. For a complete trade proposal between two named teams — where you also need to know who wins on value — use evaluate_trade instead, which runs this same check for both sides plus computes trade value.",
    input_schema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Abbreviation of the team whose cap situation to check." },
        outgoingPlayerIds: {
          type: "array",
          items: { type: "string" },
          description: "Player ids (from get_roster) on this team's own roster that it would send away.",
        },
        incomingPlayerIds: {
          type: "array",
          items: { type: "string" },
          description: "Player ids (from get_roster, on any team) that this team would receive.",
        },
      },
      required: ["teamId", "outgoingPlayerIds", "incomingPlayerIds"],
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
  {
    name: "find_trade_targets",
    description:
      "Search every other team's roster for legal, mutually-beneficial trade packages that get the user's team a player at a given position. Use this when the user describes what they need in general terms (e.g. \"I need a starting PG\") rather than naming a specific target player — it's much better than guessing a single trade yourself. Returns already cap-checked, value-ranked candidates.",
    input_schema: {
      type: "object",
      properties: {
        myTeamId: { type: "string", description: "Abbreviation of the user's team." },
        targetPosition: {
          type: "string",
          enum: POSITIONS,
          description: "Position the user wants to acquire. Omit to search all positions.",
        },
        eligibleSendingPositions: {
          type: "array",
          items: { type: "string", enum: POSITIONS },
          description:
            'Restrict which of the user\'s own players are available to trade, by position (e.g. ["SF","SG"] if the user says they\'ll give up wings). Omit to consider the whole roster.',
        },
        excludePlayerIds: {
          type: "array",
          items: { type: "string" },
          description: "Player ids (from get_roster) on the user's team who are untouchable.",
        },
        maxPackageSize: {
          type: "integer",
          description: "Max number of the user's players to package together in one trade. Default 2.",
        },
        limit: {
          type: "integer",
          description: "How many ranked candidate trades to return. Default 3.",
        },
      },
      required: ["myTeamId"],
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

function teamPayroll(roster: Player[]): number {
  return roster.reduce((sum, p) => sum + p.salary, 0);
}

export function runCheckCapValidity(input: {
  teamId: string;
  outgoingPlayerIds: string[];
  incomingPlayerIds: string[];
}): string {
  const team = teams.find((t) => t.id === input.teamId);
  if (!team) {
    return JSON.stringify({ error: `Unknown teamId "${input.teamId}".` });
  }

  const roster = rosterFor(input.teamId);
  const outgoing = roster.filter((p) => input.outgoingPlayerIds.includes(p.id));
  const missingOutgoing = input.outgoingPlayerIds.filter((id) => !outgoing.some((p) => p.id === id));
  if (missingOutgoing.length > 0) {
    return JSON.stringify({
      error: `Some outgoing player ids are not on ${team.city} ${team.name}'s roster. Call get_roster to confirm ids.`,
      missingOutgoing,
    });
  }

  const incoming = players.filter((p) => input.incomingPlayerIds.includes(p.id));
  const missingIncoming = input.incomingPlayerIds.filter((id) => !incoming.some((p) => p.id === id));
  if (missingIncoming.length > 0) {
    return JSON.stringify({
      error: "Some incoming player ids were not found. Call get_roster to confirm ids.",
      missingIncoming,
    });
  }

  const outgoingSalary = outgoing.reduce((sum, p) => sum + p.salary, 0);
  const incomingSalary = incoming.reduce((sum, p) => sum + p.salary, 0);
  const check = checkSalaryMatch(teamPayroll(roster), outgoingSalary, incomingSalary);

  return JSON.stringify({
    team: `${team.city} ${team.name}`,
    outgoingPlayers: outgoing.map((p) => p.name),
    incomingPlayers: incoming.map((p) => p.name),
    ...check,
  });
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

function playerName(id: string): string {
  return players.find((p) => p.id === id)?.name ?? id;
}

function teamName(id: string): string {
  const team = teams.find((t) => t.id === id);
  return team ? `${team.city} ${team.name}` : id;
}

export function runFindTradeTargets(input: FindTradesRequest): string {
  const team = teams.find((t) => t.id === input.myTeamId);
  if (!team) {
    return JSON.stringify({ error: `Unknown teamId "${input.myTeamId}".` });
  }

  const candidates = findTradeTargets(input, players);

  return JSON.stringify({
    myTeam: teamName(input.myTeamId),
    candidates: candidates.map((c) => ({
      partnerTeam: teamName(c.partnerTeamId),
      partnerTeamId: c.partnerTeamId,
      youSend: c.sendingPlayerIds.map(playerName),
      youReceive: playerName(c.receivingPlayerId),
      legal: c.evaluation.legal,
      yourNetValue: c.evaluation.teams[0].netValue,
      partnerNetValue: c.evaluation.teams[1].netValue,
      summary: c.evaluation.summary,
    })),
  });
}

export function runTool(name: string, input: unknown): string {
  switch (name) {
    case "get_roster":
      return runGetRoster(input as { teamId: string });
    case "check_cap_validity":
      return runCheckCapValidity(
        input as { teamId: string; outgoingPlayerIds: string[]; incomingPlayerIds: string[] },
      );
    case "evaluate_trade":
      return runEvaluateTrade(
        input as {
          teamAId: string;
          teamASendingPlayerIds: string[];
          teamBId: string;
          teamBSendingPlayerIds: string[];
        },
      );
    case "find_trade_targets":
      return runFindTradeTargets(input as FindTradesRequest);
    default:
      return JSON.stringify({ error: `Unknown tool "${name}".` });
  }
}
