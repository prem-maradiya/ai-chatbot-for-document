import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { chunkText } from "@/lib/chunk";
import { embed } from "@/lib/gemini";
import { getSupabase } from "@/lib/supabase";

// Indexing a large PDF can take a while — give the route headroom.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 1. Extract raw text (PDF via unpdf, otherwise treat as plain text).
    let text: string;
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const pdf = await getDocumentProxy(buffer);
      const result = await extractText(pdf, { mergePages: true });
      text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
    } else {
      text = await file.text();
    }

    // 2. Chunk it.
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No text could be extracted from this file" },
        { status: 400 },
      );
    }

    // 3. Embed in batches, then bulk-insert into pgvector.
    const batchSize = 64;
    const rows: { content: string; embedding: number[]; metadata: object }[] = [];
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await embed(batch, "document");
      batch.forEach((content, j) => {
        rows.push({ content, embedding: embeddings[j], metadata: { source: file.name } });
      });
    }

    const { error } = await getSupabase().from("documents").insert(rows);
    if (error) throw error;

    return NextResponse.json({ chunks: chunks.length, source: file.name });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
