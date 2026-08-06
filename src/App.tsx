import { useMemo, useState } from "react";
import { teams } from "./data/teams";
import { players } from "./data/players";
import { TeamSelector } from "./components/TeamSelector";
import { TeamRoster } from "./components/TeamRoster";
import { TradeBuilder } from "./components/TradeBuilder";
import "./App.css";

type View = "rosters" | "trade-builder";

function App() {
  const [view, setView] = useState<View>("rosters");
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
        <nav className="view-tabs">
          <button
            type="button"
            className={view === "rosters" ? "active" : ""}
            onClick={() => setView("rosters")}
          >
            Rosters
          </button>
          <button
            type="button"
            className={view === "trade-builder" ? "active" : ""}
            onClick={() => setView("trade-builder")}
          >
            Trade Builder
          </button>
        </nav>
      </header>
      <main>
        {view === "rosters" && (
          <>
            <TeamSelector teams={teams} selectedTeamId={selectedTeamId} onSelect={setSelectedTeamId} />
            <TeamRoster team={selectedTeam} players={teamPlayers} />
          </>
        )}
        {view === "trade-builder" && <TradeBuilder teams={teams} players={players} />}
      </main>
    </div>
  );
}

export default App;
