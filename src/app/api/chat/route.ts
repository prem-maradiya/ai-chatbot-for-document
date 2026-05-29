import { NextRequest } from "next/server";
import { getAnthropic, CHAT_MODEL } from "@/lib/anthropic";
import { embed } from "@/lib/voyage";
import { getSupabase } from "@/lib/supabase";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a helpful assistant that answers questions using only the provided context from the user's documents.

Rules:
- Answer using only information found in the <context> below.
- If the context does not contain the answer, say you don't know based on the provided documents — do not make things up.
- When you use information from a source, cite its filename in brackets, e.g. [report.pdf].
- Be concise and accurate.`;

type Match = { content: string; metadata: { source?: string }; similarity: number };

export async function POST(req: NextRequest) {
  const { message } = (await req.json()) as { message?: unknown };
  if (typeof message !== "string" || !message.trim()) {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 1. Embed the query and retrieve the most relevant chunks.
  const [queryEmbedding] = await embed([message], "query");
  const { data, error } = await getSupabase().rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_count: 5,
  });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const matches = (data ?? []) as Match[];
  const context = matches
    .map((m, i) => `[${i + 1}] (source: ${m.metadata?.source ?? "unknown"})\n${m.content}`)
    .join("\n\n");

  // Sources surfaced to the UI so the user can see what grounded the answer.
  const sources = matches.map((m, i) => ({
    index: i + 1,
    source: m.metadata?.source ?? "unknown",
    similarity: Math.round((m.similarity ?? 0) * 100) / 100,
    snippet: m.content.slice(0, 220),
  }));

  // 2. Stream the answer back as newline-delimited JSON frames:
  //    {"type":"sources",...} once, then {"type":"delta","text":...} per token.
  const encoder = new TextEncoder();
  const frame = (obj: unknown) => encoder.encode(JSON.stringify(obj) + "\n");

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(frame({ type: "sources", sources }));
      try {
        const claudeStream = getAnthropic().messages.stream({
          model: CHAT_MODEL,
          max_tokens: 1024,
          // cache_control marks the stable instructions as cacheable so repeated
          // questions reuse the cached prefix once it exceeds the model minimum.
          system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
          messages: [
            {
              role: "user",
              content: `<context>\n${context || "No relevant documents found."}\n</context>\n\nQuestion: ${message}`,
            },
          ],
        });

        for await (const event of claudeStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(frame({ type: "delta", text: event.delta.text }));
          }
        }
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Generation failed";
        controller.enqueue(frame({ type: "error", message: detail }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
