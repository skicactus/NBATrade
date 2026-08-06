import type { Player, Position } from "../types/player";
import { evaluateTrade, type TradeEvaluation } from "./evaluateTrade";

// A trade only makes it into results if the *partner* team doesn't lose more
// than this much value — otherwise the search would surface "steals" no
// real counterpart GM would agree to.
const PARTNER_LOSS_TOLERANCE = 5_000_000;

export interface FindTradesRequest {
  myTeamId: string;
  /** Position the user is trying to acquire. Omit to search all positions. */
  targetPosition?: Position;
  /** Restrict which of the user's own players are up for trade, by position. Omit = whole roster. */
  eligibleSendingPositions?: Position[];
  /** Player ids on the user's team that are untouchable. */
  excludePlayerIds?: string[];
  /** How many of the user's players to package together (1-3). Default 2. */
  maxPackageSize?: number;
  /** How many ranked candidates to return (1-10). Default 3. */
  limit?: number;
}

export interface TradeCandidate {
  partnerTeamId: string;
  sendingPlayerIds: string[];
  receivingPlayerId: string;
  evaluation: TradeEvaluation;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function combinations(items: Player[], maxSize: number): Player[][] {
  const result: Player[][] = [];

  function backtrack(start: number, current: Player[]) {
    if (current.length > 0) result.push([...current]);
    if (current.length === maxSize) return;
    for (let i = start; i < items.length; i++) {
      current.push(items[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return result;
}

export function findTradeTargets(request: FindTradesRequest, allPlayers: Player[]): TradeCandidate[] {
  const maxPackageSize = clamp(request.maxPackageSize ?? 2, 1, 3);
  const limit = clamp(request.limit ?? 3, 1, 10);

  const myRoster = allPlayers.filter((p) => p.teamId === request.myTeamId);
  const tradeablePool = myRoster.filter((p) => {
    if (request.excludePlayerIds?.includes(p.id)) return false;
    if (request.eligibleSendingPositions && !request.eligibleSendingPositions.includes(p.position)) return false;
    return true;
  });
  const sendingCombos = combinations(tradeablePool, maxPackageSize);

  const partnerTeamIds = Array.from(new Set(allPlayers.map((p) => p.teamId))).filter(
    (id) => id !== request.myTeamId,
  );

  const candidates: TradeCandidate[] = [];

  for (const partnerTeamId of partnerTeamIds) {
    const partnerRoster = allPlayers.filter((p) => p.teamId === partnerTeamId);
    const targets = request.targetPosition
      ? partnerRoster.filter((p) => p.position === request.targetPosition)
      : partnerRoster;

    for (const target of targets) {
      for (const sendingCombo of sendingCombos) {
        const evaluation = evaluateTrade({
          sides: [
            { teamId: request.myTeamId, sending: sendingCombo, currentRoster: myRoster },
            { teamId: partnerTeamId, sending: [target], currentRoster: partnerRoster },
          ],
        });

        if (!evaluation.legal) continue;
        if (evaluation.teams[1].netValue < -PARTNER_LOSS_TOLERANCE) continue;

        candidates.push({
          partnerTeamId,
          sendingPlayerIds: sendingCombo.map((p) => p.id),
          receivingPlayerId: target.id,
          evaluation,
        });
      }
    }
  }

  candidates.sort((a, b) => b.evaluation.teams[0].netValue - a.evaluation.teams[0].netValue);

  return candidates.slice(0, limit);
}
