#!/usr/bin/env node
// Computes the `overall` field in src/data/players.ts from real per-game
// stats, matched to the current roster by player name.
//
// Usage:
//   node scripts/compute-overall-ratings.mjs <stats.json> [<stats2.json> ...]
//
// Each input file is a flat JSON array of stat records:
//   { name, gp, mpg, fgPct, threePct, ftPct, rpg, apg, spg, bpg, ppg }
// (fgPct/threePct/ftPct as 0-1 decimals; any field can be omitted if the
// source table didn't have it — the formula treats a missing shooting
// percentage as league-average/neutral rather than penalizing it.)
//
// A player needs at least MIN_GP games played in the source season to get
// a stat-derived rating; below that (rookies, draft-and-stash, injury-outs)
// their existing `overall` value in players.ts is left untouched, since
// there's no real in-season sample to compute from. 25 was chosen after
// 15 proved too low in practice: Jayson Tatum's 16-game sample (a stretch
// recovering from an Achilles tear, shooting a career-worst 41.1% FG)
// computed a lower rating than his actual caliber warrants. 25+ games
// still includes plenty of injury-shortened-but-real star seasons
// (Giannis at 36 games, Embiid at 38) while filtering out the noisiest,
// most likely injury-contaminated small samples.
//
// This was originally run against 2025-26 season stats (researched from
// each team's "2025–26 [Team] season" Wikipedia article) to replace the
// subjective tier ratings the initial 2026-27 dataset shipped with.
import { readFileSync, writeFileSync } from "node:fs";

const MIN_GP = 25;
const PLAYERS_FILE = new URL("../src/data/players.ts", import.meta.url);

const statsFiles = process.argv.slice(2);
if (statsFiles.length === 0) {
  console.error("Usage: node scripts/compute-overall-ratings.mjs <stats.json> [...]");
  process.exit(1);
}

let statsRecords = [];
for (const path of statsFiles) {
  statsRecords = statsRecords.concat(JSON.parse(readFileSync(path, "utf-8")));
}

// If a player appears more than once (e.g. traded mid-season and listed on
// two teams' pages), keep the stint with more games played.
const statsByName = new Map();
for (const r of statsRecords) {
  if (!r.name) continue;
  const existing = statsByName.get(r.name);
  if (!existing || (r.gp ?? 0) > (existing.gp ?? 0)) {
    statsByName.set(r.name, r);
  }
}

// Composite = scoring + weighted rebounding/playmaking/defense, plus a
// shooting-efficiency adjustment relative to a league-average baseline
// (45% FG / 35% 3PT / 75% FT), scaled onto a 40-99 range. This is a
// deliberately simple demo formula, not a scouting model — it will over-
// value low-volume, high-efficiency bigs relative to high-usage wings on
// bad shooting nights, among other known biases.
function computeOverall(s) {
  const ppg = s.ppg ?? 0;
  const rpg = s.rpg ?? 0;
  const apg = s.apg ?? 0;
  const spg = s.spg ?? 0;
  const bpg = s.bpg ?? 0;
  const fgPct = s.fgPct ?? 0.45;
  const threePct = s.threePct ?? 0.35;
  const ftPct = s.ftPct ?? 0.75;

  const composite =
    ppg + 1.2 * rpg + 1.5 * apg + 2.0 * spg + 2.0 * bpg +
    (fgPct - 0.45) * 40 +
    (threePct - 0.35) * 15 +
    (ftPct - 0.75) * 10;

  return Math.min(99, Math.max(40, Math.round(40 + composite)));
}

const src = readFileSync(PLAYERS_FILE, "utf-8");
const lineRe = /\{ id: "([^"]+)", name: "([^"]+)", teamId: "([^"]+)", position: "([^"]+)", age: (\d+), overall: (\d+), salary: (\d+), contractYearsLeft: (\d+) \},/;

let updated = 0;
let kept = 0;

const newLines = src.split("\n").map((line) => {
  const m = line.match(lineRe);
  if (!m) return line;

  const [, id, name, teamId, position, age, , salary, contractYearsLeft] = m;
  const stats = statsByName.get(name);

  if (stats && (stats.gp ?? 0) >= MIN_GP) {
    updated++;
    const newOverall = computeOverall(stats);
    return `  { id: "${id}", name: "${name}", teamId: "${teamId}", position: "${position}", age: ${age}, overall: ${newOverall}, salary: ${salary}, contractYearsLeft: ${contractYearsLeft} },`;
  }

  kept++;
  return line;
});

writeFileSync(PLAYERS_FILE, newLines.join("\n"), "utf-8");
console.log(`Updated ${updated} players with stat-derived ratings; kept ${kept} existing ratings (no sufficient sample).`);
