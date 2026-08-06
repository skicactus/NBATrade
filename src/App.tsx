import { useMemo, useState } from "react";
import { teams } from "./data/teams";
import { players } from "./data/players";
import { TeamSelector } from "./components/TeamSelector";
import { TeamRoster } from "./components/TeamRoster";
import { TradeBuilder } from "./components/TradeBuilder";
import { AiTradeAssistant } from "./components/AiTradeAssistant";
import "./App.css";

type View = "rosters" | "trade-builder" | "ai-assistant";

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
          <button
            type="button"
            className={view === "ai-assistant" ? "active" : ""}
            onClick={() => setView("ai-assistant")}
          >
            AI GM
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
        {view === "ai-assistant" && <AiTradeAssistant />}
      </main>
    </div>
  );
}

export default App;
