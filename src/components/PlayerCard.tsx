import type { Player } from "../types/player";

function formatSalary(salary: number): string {
  return `$${(salary / 1_000_000).toFixed(1)}M`;
}

interface PlayerCardProps {
  player: Player;
}

export function PlayerCard({ player }: PlayerCardProps) {
  return (
    <div className="player-card">
      <div className="player-card-main">
        <span className="player-name">{player.name}</span>
        <span className="player-position">{player.position}</span>
      </div>
      <div className="player-card-stats">
        <span>OVR {player.overall}</span>
        <span>Age {player.age}</span>
        <span>{formatSalary(player.salary)}</span>
        <span>
          {player.contractYearsLeft} yr{player.contractYearsLeft === 1 ? "" : "s"} left
        </span>
      </div>
    </div>
  );
}
