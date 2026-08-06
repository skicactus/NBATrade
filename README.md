# AI GM Trade Desk

A web tool for constructing and auto-finding salary-cap-legal NBA trades. An LLM
orchestrates deterministic valuation and constraint tools; a React Flow view
visualizes proposed trades as a graph of teams and players.

Stack: Vite + React + TypeScript, LLM tool-calling, React Flow.

## Status

Day 5: a React Flow trade visualizer — the manual Trade Builder renders
every proposed trade as a graph (teams and players as nodes, edges showing
who moves where), color-coded green/red by cap legality. The trade
finder (Day 4) lets you describe a need in plain English ("I need a
starting PG, I can give up wings") instead of naming a specific player;
the agent searches every other team's roster for legal, ranked packages.
The LLM never computes cap legality or value itself — it only calls
`get_roster` / `evaluate_trade` / `find_trade_targets` and explains the
results.

## Development

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

`npm run dev` also serves `/api/chat` locally via a Vite dev-server
middleware, so the AI GM tab works without deploying. In production
(Vercel), the same logic runs as the `api/chat.ts` serverless function —
the API key never reaches the browser.

## Roadmap

- Day 2: deterministic player value model + cap-match validator (`evaluate_trade`) — done
- Day 3: LLM tool-calling loop (trade evaluation + explanation) — done
- Day 4: trade finder — search + rank legal packages from a plain-English request — done
- Day 5: React Flow trade visualizer — done
- Day 6: error handling, edge cases, architecture docs
- Day 7: final deploy + demo
