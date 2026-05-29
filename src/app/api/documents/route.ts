import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// List indexed documents (one entry per source file, with chunk counts).
export async function GET() {
  const { data, error } = await getSupabase().rpc("list_documents");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ documents: data ?? [] });
}

// Delete every chunk belonging to a given source file.
export async function DELETE(req: NextRequest) {
  const { source } = (await req.json()) as { source?: unknown };
  if (typeof source !== "string" || !source) {
    return NextResponse.json({ error: "source is required" }, { status: 400 });
  }

  const { error } = await getSupabase()
    .from("documents")
    .delete()
    .eq("metadata->>source", source);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
