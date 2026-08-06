# AI GM Trade Desk

A web tool for constructing and auto-finding salary-cap-legal NBA trades. An LLM
orchestrates deterministic valuation and constraint tools; a React Flow view
visualizes proposed trades as a graph of teams and players.

Stack: Vite + React + TypeScript, LLM tool-calling, React Flow.

## Status

Day 1: project scaffold, seed player/team dataset, roster view.

## Development

```bash
npm install
npm run dev
```

## Roadmap

- Day 2: deterministic player value model + cap-match validator (`evaluate_trade`)
- Day 3: LLM tool-calling loop (trade evaluation + explanation)
- Day 4: trade finder — search + rank legal packages from a plain-English request
- Day 5: React Flow trade visualizer
- Day 6: error handling, edge cases, architecture docs
- Day 7: final deploy + demo
