import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// List indexed documents (one entry per source file, with chunk counts).
export async function GET() {
  try {
    const { data, error } = await getSupabase().rpc("list_documents");
    if (error) throw error;
    return NextResponse.json({ documents: data ?? [] });
  } catch (err) {
    console.error("documents GET failed:", err);
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
  }
}

// Delete every chunk belonging to a given source file.
export async function DELETE(req: NextRequest) {
  try {
    const { source } = (await req.json()) as { source?: unknown };
    if (typeof source !== "string" || !source) {
      return NextResponse.json({ error: "source is required" }, { status: 400 });
    }

    const { error } = await getSupabase()
      .from("documents")
      .delete()
      .eq("metadata->>source", source);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("documents DELETE failed:", err);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
