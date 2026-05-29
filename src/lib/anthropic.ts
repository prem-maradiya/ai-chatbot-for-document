import Anthropic from "@anthropic-ai/sdk";

// Lazily instantiated so importing this module doesn't require ANTHROPIC_API_KEY
// at build time (the SDK constructor throws when the key is missing).
let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

// Default to the most capable model. To stretch free trial credits, set
// CHAT_MODEL=claude-haiku-4-5 in .env.local — Haiku costs a fraction as much.
export const CHAT_MODEL = process.env.CHAT_MODEL ?? "claude-opus-4-8";
