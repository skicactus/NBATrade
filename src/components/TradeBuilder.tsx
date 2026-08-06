import { useMemo, useState } from "react";
import type { Player, Team } from "../types/player";
import { evaluateTrade } from "../engine/evaluateTrade";
import { TradeFlowGraph } from "./TradeFlowGraph";

function formatSalary(salary: number): string {
  const sign = salary < 0 ? "-" : "";
  return `${sign}$${(Math.abs(salary) / 1_000_000).toFixed(1)}M`;
}

interface TeamSidePickerProps {
  team: Team;
  roster: Player[];
  selectedIds: Set<string>;
  onToggle: (playerId: string) => void;
}

function TeamSidePicker({ team, roster, selectedIds, onToggle }: TeamSidePickerProps) {
  return (
    <div className="trade-side">
      <h3>
        {team.city} {team.name}
      </h3>
      <div className="trade-side-list">
        {roster.map((player) => (
          <label key={player.id} className="trade-player-option">
            <input
              type="checkbox"
              checked={selectedIds.has(player.id)}
              onChange={() => onToggle(player.id)}
            />
            {player.name} — {player.position}, OVR {player.overall}, {formatSalary(player.salary)}
          </label>
        ))}
        {roster.length === 0 && <p className="empty-roster">No players on this team.</p>}
      </div>
    </div>
  );
}

interface TradeBuilderProps {
  teams: Team[];
  players: Player[];
}

export function TradeBuilder({ teams, players }: TradeBuilderProps) {
  const [teamAId, setTeamAId] = useState(teams[0]?.id ?? "");
  const [teamBId, setTeamBId] = useState(teams[1]?.id ?? teams[0]?.id ?? "");
  const [selectedA, setSelectedA] = useState<Set<string>>(new Set());
  const [selectedB, setSelectedB] = useState<Set<string>>(new Set());

  const teamA = teams.find((t) => t.id === teamAId);
  const teamB = teams.find((t) => t.id === teamBId);
  const rosterA = useMemo(() => players.filter((p) => p.teamId === teamAId), [players, teamAId]);
  const rosterB = useMemo(() => players.filter((p) => p.teamId === teamBId), [players, teamBId]);

  function toggleA(playerId: string) {
    setSelectedA((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  function toggleB(playerId: string) {
    setSelectedB((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  function selectTeamA(id: string) {
    setTeamAId(id);
    setSelectedA(new Set());
  }

  function selectTeamB(id: string) {
    setTeamBId(id);
    setSelectedB(new Set());
  }

  const sendingA = useMemo(() => rosterA.filter((p) => selectedA.has(p.id)), [rosterA, selectedA]);
  const sendingB = useMemo(() => rosterB.filter((p) => selectedB.has(p.id)), [rosterB, selectedB]);

  const result = useMemo(() => {
    if (!teamA || !teamB || teamA.id === teamB.id || sendingA.length === 0 || sendingB.length === 0) return null;

    return evaluateTrade({
      sides: [
        { teamId: teamA.id, sending: sendingA, currentRoster: rosterA },
        { teamId: teamB.id, sending: sendingB, currentRoster: rosterB },
      ],
    });
  }, [teamA, teamB, rosterA, rosterB, sendingA, sendingB]);

  return (
    <div className="trade-builder">
      <div className="trade-builder-teams">
        <div>
          <select value={teamAId} onChange={(e) => selectTeamA(e.target.value)}>
            {teams.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === teamBId}>
                {t.city} {t.name}
              </option>
            ))}
          </select>
          {teamA && (
            <TeamSidePicker team={teamA} roster={rosterA} selectedIds={selectedA} onToggle={toggleA} />
          )}
        </div>
        <div>
          <select value={teamBId} onChange={(e) => selectTeamB(e.target.value)}>
            {teams.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === teamAId}>
                {t.city} {t.name}
              </option>
            ))}
          </select>
          {teamB && (
            <TeamSidePicker team={teamB} roster={rosterB} selectedIds={selectedB} onToggle={toggleB} />
          )}
        </div>
      </div>

      {result && teamA && teamB && (
        <>
          <div className={`trade-result ${result.legal ? "legal" : "illegal"}`}>
            <p className="trade-result-summary">{result.summary}</p>
            <div className="trade-result-teams">
              {result.teams.map((t) => (
                <div key={t.teamId} className="trade-result-team">
                  <strong>{t.teamId}</strong>
                  <span>Sends {formatSalary(t.outgoingSalary)}</span>
                  <span>Receives {formatSalary(t.incomingSalary)}</span>
                  <span>Net value {formatSalary(t.netValue)}</span>
                  <span className={t.capCheck.legal ? "cap-ok" : "cap-bad"}>
                    {t.capCheck.legal ? "Cap OK" : "Cap violation"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <TradeFlowGraph teamA={teamA} teamB={teamB} sendingA={sendingA} sendingB={sendingB} evaluation={result} />
        </>
      )}
    </div>
  );
}
