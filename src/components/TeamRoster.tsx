import type { Player, Team } from "../types/player";
import { PlayerCard } from "./PlayerCard";

function formatSalary(total: number): string {
  return `$${(total / 1_000_000).toFixed(1)}M`;
}

interface TeamRosterProps {
  team: Team;
  players: Player[];
}

export function TeamRoster({ team, players }: TeamRosterProps) {
  const capTotal = players.reduce((sum, p) => sum + p.salary, 0);

  return (
    <div className="team-roster">
      <div className="team-roster-header">
        <h2>
          {team.city} {team.name}
        </h2>
        <span className="team-cap-total">{formatSalary(capTotal)} total</span>
      </div>
      <div className="player-list">
        {players.map((player) => (
          <PlayerCard key={player.id} player={player} />
        ))}
        {players.length === 0 && <p className="empty-roster">No players loaded for this team.</p>}
      </div>
    </div>
  );
}
