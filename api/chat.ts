import { handleChat, type ChatTurn } from "./_lib/chatHandler";

interface VercelRequest {
  method?: string;
  body: unknown;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = req.body as { messages?: ChatTurn[] };
  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    res.status(400).json({ error: "Request body must include a non-empty messages array." });
    return;
  }

  try {
    const result = await handleChat(body.messages);
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown server error";
    res.status(500).json({ error: message });
  }
}
