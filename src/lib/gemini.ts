import { GoogleGenAI } from "@google/genai";

// Lazily instantiated so importing this module doesn't require GOOGLE_API_KEY
// at build time.
let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  return client;
}

// Generation model. Defaults to the fast, current Flash model.
// Override with CHAT_MODEL (e.g. gemini-2.5-flash-lite) in .env.local.
export const CHAT_MODEL = process.env.CHAT_MODEL ?? "gemini-2.5-flash";

// gemini-embedding-001 with outputDimensionality 768. Keep this dimension in
// sync with the vector(768) column in supabase/schema.sql.
const EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIM = 768;

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
      outputDimensionality: EMBED_DIM,
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
