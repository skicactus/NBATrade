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

You have two tools:
- get_roster: look up a team's current players and their ids, ratings, salaries, and contracts.
- evaluate_trade: deterministically check whether a proposed trade is salary-cap legal and which team gains more value.

Rules:
- Never invent player salaries, ratings, contract years, cap legality, or trade value — those numbers come only from tool results.
- Before calling evaluate_trade, use get_roster to resolve player names to ids for every team involved.
- After evaluate_trade returns, explain the result in plain basketball terms: whether it's legal (and why, if not), and which team comes out ahead on value and by roughly how much.
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
