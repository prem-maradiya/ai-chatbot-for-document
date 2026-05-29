import { GoogleGenAI } from "@google/genai";

// Lazily instantiated so importing this module doesn't require GOOGLE_API_KEY
// at build time.
let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  return client;
}

// Generation model. Defaults to the fast, free-tier-friendly Flash model.
// Override with CHAT_MODEL (e.g. gemini-2.5-flash) in .env.local.
export const CHAT_MODEL = process.env.CHAT_MODEL ?? "gemini-2.0-flash";

// text-embedding-004 → 768-dim vectors. Keep in sync with the vector(768)
// column dimension in supabase/schema.sql.
const EMBED_MODEL = "text-embedding-004";

/**
 * Embed one or more texts with Google's embedding model.
 * taskType is set per side ("document" when indexing, "query" when searching),
 * which Google optimizes differently to improve retrieval quality.
 */
export async function embed(
  texts: string[],
  inputType: "document" | "query",
): Promise<number[][]> {
  const res = await ai().models.embedContent({
    model: EMBED_MODEL,
    contents: texts,
    config: {
      taskType: inputType === "document" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY",
    },
  });
  return (res.embeddings ?? []).map((e) => e.values ?? []);
}

/**
 * Stream a grounded answer. Returns an async iterable of response chunks;
 * read `chunk.text` from each.
 */
export async function streamAnswer(system: string, userContent: string) {
  return ai().models.generateContentStream({
    model: CHAT_MODEL,
    contents: userContent,
    config: { systemInstruction: system, maxOutputTokens: 1024 },
  });
}
