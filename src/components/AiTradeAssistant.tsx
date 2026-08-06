import { useState } from "react";
import { TradeFlowGraph } from "./TradeFlowGraph";
import { visualizeToolCall } from "../lib/visualizeToolCall";

interface ToolCallTrace {
  name: string;
  input: unknown;
  result: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallTrace[];
}

export function AiTradeAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, toolCalls: data.toolCalls },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function newChat() {
    setMessages([]);
    setInput("");
    setError(null);
  }

  return (
    <div className="ai-assistant">
      {messages.length > 0 && (
        <div className="ai-assistant-header">
          <button type="button" className="ai-new-chat" onClick={newChat}>
            New chat
          </button>
        </div>
      )}
      <div className="ai-assistant-messages">
        {messages.length === 0 && (
          <p className="ai-assistant-hint">
            Ask about a trade, e.g. "I'm the Spurs, I need a starting PG. What could I offer
            the Lakers for a guard?"
          </p>
        )}
        {messages.map((m, i) => {
          const visualizations = (m.toolCalls ?? []).flatMap((tc) => visualizeToolCall(tc.name, tc.input));
          return (
            <div key={i} className={`ai-message ai-message-${m.role}`}>
              <div className="ai-message-role">{m.role === "user" ? "You" : "AI GM"}</div>
              <div className="ai-message-text">{m.content}</div>
              {visualizations.length > 0 && (
                <div className="ai-message-graphs">
                  {visualizations.map((v) => (
                    <div key={v.key}>
                      {v.label && <p className="ai-graph-label">{v.label}</p>}
                      <TradeFlowGraph
                        teamA={v.teamA}
                        teamB={v.teamB}
                        sendingA={v.sendingA}
                        sendingB={v.sendingB}
                        evaluation={v.evaluation}
                        height={280}
                      />
                    </div>
                  ))}
                </div>
              )}
              {m.toolCalls && m.toolCalls.length > 0 && (
                <details className="ai-tool-trace">
                  <summary>{m.toolCalls.length} tool call(s)</summary>
                  {m.toolCalls.map((tc, j) => (
                    <div key={j} className="ai-tool-call">
                      <code>{tc.name}({JSON.stringify(tc.input)})</code>
                      <pre>{tc.result}</pre>
                    </div>
                  ))}
                </details>
              )}
            </div>
          );
        })}
        {loading && <p className="ai-assistant-hint">Thinking…</p>}
        {error && <p className="ai-assistant-error">{error}</p>}
      </div>
      <div className="ai-assistant-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe a trade or ask a question..."
          rows={2}
          disabled={loading}
        />
        <button type="button" onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
