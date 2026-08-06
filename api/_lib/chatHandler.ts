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

You have four tools:
- get_roster: look up a team's current players and their ids, ratings, salaries, and contracts.
- check_cap_validity: check the salary-matching legality of what ONE team sends vs. takes back, given its current payroll. Use this only for a narrow cap-math question about a single team in isolation ("could the Bulls absorb this much salary?") — not for evaluating a full trade.
- evaluate_trade: deterministically check whether a specific proposed two-team trade is salary-cap legal and which team gains more value. This is the default tool for "is this trade legal / who wins" questions — it already runs the same cap check as check_cap_validity for both sides.
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

export function friendlyApiError(err: unknown): Error {
  if (err instanceof Anthropic.AuthenticationError) {
    return new Error("The server's ANTHROPIC_API_KEY was rejected. Check that it's set and valid.");
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new Error("Rate limited by the Anthropic API — try again in a moment.");
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new Error("Couldn't reach the Anthropic API. Check your network connection and try again.");
  }
  if (err instanceof Anthropic.APIError) {
    return new Error(`Anthropic API error (${err.status ?? "unknown"}): ${err.message}`);
  }
  return err instanceof Error ? err : new Error("Unknown error calling the Anthropic API.");
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
    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: toolDefinitions,
        messages,
      });
    } catch (err) {
      throw friendlyApiError(err);
    }

    if (response.stop_reason === "refusal") {
      return {
        reply: "I can't help with that request. Try rephrasing it as a basketball trade question.",
        toolCalls,
      };
    }

    if (response.stop_reason !== "tool_use") {
      const reply = textFromContent(response.content);
      return {
        reply: reply || "I didn't get a text response — try rephrasing your request.",
        toolCalls,
      };
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

  throw new Error(
    "The AI GM got stuck gathering information without reaching an answer. Try a simpler or more specific request.",
  );
}
