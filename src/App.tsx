import { useMemo, useState } from "react";
import { teams } from "./data/teams";
import { players } from "./data/players";
import { TeamSelector } from "./components/TeamSelector";
import { TeamRoster } from "./components/TeamRoster";
import "./App.css";

function App() {
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0].id);

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId) ?? teams[0],
    [selectedTeamId],
  );

  const teamPlayers = useMemo(
    () => players.filter((p) => p.teamId === selectedTeamId),
    [selectedTeamId],
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI GM Trade Desk</h1>
        <TeamSelector teams={teams} selectedTeamId={selectedTeamId} onSelect={setSelectedTeamId} />
      </header>
      <main>
        <TeamRoster team={selectedTeam} players={teamPlayers} />
      </main>
    </div>
  );
}

export default App;
