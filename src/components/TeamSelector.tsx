import type { Team } from "../types/player";

interface TeamSelectorProps {
  teams: Team[];
  selectedTeamId: string;
  onSelect: (teamId: string) => void;
}

export function TeamSelector({ teams, selectedTeamId, onSelect }: TeamSelectorProps) {
  return (
    <select
      className="team-selector"
      value={selectedTeamId}
      onChange={(e) => onSelect(e.target.value)}
    >
      {teams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.city} {team.name}
        </option>
      ))}
    </select>
  );
}
