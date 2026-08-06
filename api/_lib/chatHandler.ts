import Anthropic from "@anthropic-ai/sdk";
import { teams } from "../../src/data/teams";
import type { Team } from "../../src/types/player";
import { toolDefinitions, runTool } from "./tools";

const MODEL = "claude-opus-5";
const MAX_TOOL_ITERATIONS = 6;

const TEAM_LIST = teams.map((t: Team) => `${t.id}: ${t.city} ${t.name}`).join("\n");

const SYSTEM_PROMPT = `You are the AI GM for an NBA trade desk app. You help a user evaluate or explore NBA trades.

Teams (id: full name):
${TEAM_LIST}

You have three tools:
- get_roster: look up a team's current players and their ids, ratings, salaries, and contracts.
- evaluate_trade: deterministically check whether a specific proposed trade is salary-cap legal and which team gains more value.
- find_trade_targets: search every other team's roster for legal, ranked trade packages that fill a need (e.g. a position), instead of the user having to name a specific target player.

Rules:
- Never invent player salaries, ratings, contract years, cap legality, or trade value — those numbers come only from tool results.
- If the user names specific players on specific teams, use get_roster to resolve names to ids, then evaluate_trade.
- If the user describes a need in general terms ("I need a starting PG", "I'll give up bench wings for size") rather than naming a target player, call find_trade_targets instead of guessing a single trade yourself. Use get_roster first only if you need to resolve specific untouchable players the user named.
- When presenting find_trade_targets results, lead with the top 2-3 candidates and explain each in one or two sentences — who's involved, whether it's legal, and roughly who wins the value.
- Keep explanations concise — a few sentences, not an essay.`;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ToolCallTrace {
  name: string;
  input: unknown;
  result: string;
}

export interface ChatResult {
  reply: string;
  toolCalls: ToolCallTrace[];
}

function textFromContent(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

export async function handleChat(history: ChatTurn[]): Promise<ChatResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set on the server.");
  }

  const client = new Anthropic({ apiKey });

  const messages: Anthropic.MessageParam[] = history.map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));

  const toolCalls: ToolCallTrace[] = [];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: toolDefinitions,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      return { reply: textFromContent(response.content), toolCalls };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((block) => {
      const result = runTool(block.name, block.input);
      toolCalls.push({ name: block.name, input: block.input, result });
      return { type: "tool_result", tool_use_id: block.id, content: result };
    });

    messages.push({ role: "user", content: toolResults });
  }

  throw new Error("Exceeded maximum tool-call iterations without a final answer.");
}
