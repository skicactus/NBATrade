import { teams } from "../data/teams";
import { players } from "../data/players";
import { evaluateTrade, type TradeEvaluation } from "../engine/evaluateTrade";
import { findTradeTargets, type FindTradesRequest } from "../engine/findTrades";
import type { Player, Team } from "../types/player";

// Re-derives full graph-ready trade data (Team/Player objects + a complete
// TradeEvaluation) from the same tool-call input the LLM used, by re-running
// the deterministic engine client-side. This keeps the tool's JSON output
// (built for the model to read) separate from what the UI needs to render
// a TradeFlowGraph, without adding a second source of truth.
export interface TradeVisualization {
  key: string;
  label?: string;
  teamA: Team;
  teamB: Team;
  sendingA: Player[];
  sendingB: Player[];
  evaluation: TradeEvaluation;
}

function findPlayer(id: string): Player | undefined {
  return players.find((p) => p.id === id);
}

function findTeam(id: string): Team | undefined {
  return teams.find((t) => t.id === id);
}

function resolvePlayers(ids: string[]): Player[] | null {
  const resolved = ids.map(findPlayer).filter((p): p is Player => p !== undefined);
  return resolved.length === ids.length ? resolved : null;
}

export function visualizeEvaluateTrade(input: unknown): TradeVisualization | null {
  const i = input as {
    teamAId?: string;
    teamASendingPlayerIds?: string[];
    teamBId?: string;
    teamBSendingPlayerIds?: string[];
  };
  if (
    !i?.teamAId ||
    !i.teamBId ||
    !Array.isArray(i.teamASendingPlayerIds) ||
    !Array.isArray(i.teamBSendingPlayerIds) ||
    i.teamASendingPlayerIds.length === 0 ||
    i.teamBSendingPlayerIds.length === 0
  ) {
    return null;
  }

  const teamA = findTeam(i.teamAId);
  const teamB = findTeam(i.teamBId);
  if (!teamA || !teamB) return null;

  const sendingA = resolvePlayers(i.teamASendingPlayerIds);
  const sendingB = resolvePlayers(i.teamBSendingPlayerIds);
  if (!sendingA || !sendingB) return null;

  const rosterA = players.filter((p) => p.teamId === teamA.id);
  const rosterB = players.filter((p) => p.teamId === teamB.id);

  const evaluation = evaluateTrade({
    sides: [
      { teamId: teamA.id, sending: sendingA, currentRoster: rosterA },
      { teamId: teamB.id, sending: sendingB, currentRoster: rosterB },
    ],
  });

  return { key: `evaluate-${i.teamAId}-${i.teamBId}`, teamA, teamB, sendingA, sendingB, evaluation };
}

export function visualizeFindTradeTargets(input: unknown): TradeVisualization[] {
  const req = input as FindTradesRequest;
  if (!req?.myTeamId) return [];

  const myTeam = findTeam(req.myTeamId);
  if (!myTeam) return [];

  const candidates = findTradeTargets(req, players);

  const visualizations: TradeVisualization[] = [];
  candidates.forEach((c, idx) => {
    const partnerTeam = findTeam(c.partnerTeamId);
    const sendingA = resolvePlayers(c.sendingPlayerIds);
    const receiving = findPlayer(c.receivingPlayerId);
    if (!partnerTeam || !sendingA || !receiving) return;

    visualizations.push({
      key: `find-${idx}-${c.partnerTeamId}-${c.receivingPlayerId}`,
      label: `Option ${idx + 1}: ${myTeam.city} ${myTeam.name} ↔ ${partnerTeam.city} ${partnerTeam.name}`,
      teamA: myTeam,
      teamB: partnerTeam,
      sendingA,
      sendingB: [receiving],
      evaluation: c.evaluation,
    });
  });

  return visualizations;
}

export function visualizeToolCall(name: string, input: unknown): TradeVisualization[] {
  if (name === "evaluate_trade") {
    const v = visualizeEvaluateTrade(input);
    return v ? [v] : [];
  }
  if (name === "find_trade_targets") {
    return visualizeFindTradeTargets(input);
  }
  return [];
}
