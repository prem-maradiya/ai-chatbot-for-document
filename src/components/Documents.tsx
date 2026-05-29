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

  // Reload on mount and whenever the parent bumps `version` (after an upload).
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

  if (loading && docs.length === 0) {
    return <p className="text-xs text-gray-400">Loading documents…</p>;
  }
  if (docs.length === 0) {
    return <p className="text-xs text-gray-400">No documents indexed yet.</p>;
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Indexed documents
      </h2>
      <ul className="flex flex-col gap-1">
        {docs.map((d) => (
          <li key={d.source} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">
              {d.source} <span className="text-gray-400">({d.chunks} chunks)</span>
            </span>
            <button
              onClick={() => remove(d.source)}
              disabled={deleting === d.source}
              className="shrink-0 rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting === d.source ? "Deleting…" : "Delete"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
