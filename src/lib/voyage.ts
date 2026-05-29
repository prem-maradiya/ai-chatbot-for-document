const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

// voyage-3.5 → 1024-dim embeddings. Keep this in sync with the vector(1024)
// column dimension in supabase/schema.sql.
const MODEL = "voyage-3.5";

/**
 * Embed one or more texts with Voyage AI.
 * Use inputType "document" when indexing and "query" when searching — Voyage
 * optimizes the embedding differently for each side, which improves retrieval.
 */
export async function embed(
  texts: string[],
  inputType: "document" | "query",
): Promise<number[][]> {
  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ input: texts, model: MODEL, input_type: inputType }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Voyage embedding failed (${res.status}): ${detail}`);
  }

  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data.map((d) => d.embedding);
}
