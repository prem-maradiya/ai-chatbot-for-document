"use client";

import { useCallback, useEffect, useState } from "react";

type Doc = { source: string; chunks: number };

export default function Documents({
  version,
  onChange,
}: {
  version: number;
  onChange: () => void;
}) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (res.ok) setDocs(data.documents ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload on mount and whenever the parent bumps `version`.
  useEffect(() => {
    load();
  }, [load, version]);

  async function remove(source: string) {
    setDeleting(source);
    try {
      const res = await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      if (res.ok) onChange();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-400">
          Documents
        </h2>
        {docs.length > 0 && (
          <span className="font-mono text-[11px] text-neutral-400">{docs.length}</span>
        )}
      </div>

      {loading && docs.length === 0 ? (
        <p className="text-xs text-neutral-400">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="text-xs text-neutral-400">No documents yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {docs.map((d) => (
            <li
              key={d.source}
              className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 transition hover:border-neutral-300"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-800">{d.source}</p>
                <p className="font-mono text-[11px] text-neutral-400">{d.chunks} chunks</p>
              </div>
              <button
                onClick={() => remove(d.source)}
                disabled={deleting === d.source}
                className="shrink-0 rounded-md px-2 py-1 text-xs text-neutral-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                {deleting === d.source ? "…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
