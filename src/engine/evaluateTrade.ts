import type { Player } from "../types/player";
import { checkSalaryMatch, type CapCheckResult } from "./capRules";
import { playerValue } from "./valueModel";

export interface TradeSide {
  teamId: string;
  /** Players this team currently has and is sending away. */
  sending: Player[];
  /** This team's full current roster, used to determine payroll/apron status. */
  currentRoster: Player[];
}

export interface TradeProposal {
  sides: [TradeSide, TradeSide];
}

export interface TeamTradeResult {
  teamId: string;
  outgoingSalary: number;
  incomingSalary: number;
  outgoingValue: number;
  incomingValue: number;
  netValue: number;
  capCheck: CapCheckResult;
}

export interface TradeEvaluation {
  legal: boolean;
  teams: [TeamTradeResult, TeamTradeResult];
  winnerTeamId: string | null;
  summary: string;
}

function teamPayroll(roster: Player[]): number {
  return roster.reduce((sum, p) => sum + p.salary, 0);
}

function totalSalary(players: Player[]): number {
  return players.reduce((sum, p) => sum + p.salary, 0);
}

function totalValue(players: Player[]): number {
  return players.reduce((sum, p) => sum + playerValue(p), 0);
}

export function evaluateTrade(proposal: TradeProposal): TradeEvaluation {
  const [sideA, sideB] = proposal.sides;

  const outgoingA = sideA.sending;
  const outgoingB = sideB.sending;

  const capCheckA = checkSalaryMatch(teamPayroll(sideA.currentRoster), totalSalary(outgoingA), totalSalary(outgoingB));
  const capCheckB = checkSalaryMatch(teamPayroll(sideB.currentRoster), totalSalary(outgoingB), totalSalary(outgoingA));

  const outgoingValueA = totalValue(outgoingA);
  const incomingValueA = totalValue(outgoingB);
  const outgoingValueB = totalValue(outgoingB);
  const incomingValueB = totalValue(outgoingA);

  const teamA: TeamTradeResult = {
    teamId: sideA.teamId,
    outgoingSalary: totalSalary(outgoingA),
    incomingSalary: totalSalary(outgoingB),
    outgoingValue: outgoingValueA,
    incomingValue: incomingValueA,
    netValue: incomingValueA - outgoingValueA,
    capCheck: capCheckA,
  };

  const teamB: TeamTradeResult = {
    teamId: sideB.teamId,
    outgoingSalary: totalSalary(outgoingB),
    incomingSalary: totalSalary(outgoingA),
    outgoingValue: outgoingValueB,
    incomingValue: incomingValueB,
    netValue: incomingValueB - outgoingValueB,
    capCheck: capCheckB,
  };

  const legal = capCheckA.legal && capCheckB.legal;

  let winnerTeamId: string | null = null;
  if (legal) {
    if (teamA.netValue > teamB.netValue) winnerTeamId = teamA.teamId;
    else if (teamB.netValue > teamA.netValue) winnerTeamId = teamB.teamId;
  }

  const summary = legal
    ? winnerTeamId
      ? `Trade is cap-legal. ${winnerTeamId} comes out ahead on value.`
      : "Trade is cap-legal and roughly even in value."
    : `Trade is not cap-legal: ${!capCheckA.legal ? capCheckA.reason : capCheckB.reason}`;

  return { legal, teams: [teamA, teamB], winnerTeamId, summary };
}
