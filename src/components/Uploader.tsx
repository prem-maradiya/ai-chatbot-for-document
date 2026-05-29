"use client";

import { DragEvent, useRef, useState } from "react";

type Status = { kind: "idle" | "working" | "done" | "error"; text: string };

export default function Uploader({ onIndexed }: { onIndexed: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle", text: "" });

  async function upload(file: File) {
    setStatus({ kind: "working", text: `Indexing ${file.name}…` });
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setStatus({ kind: "done", text: `Indexed ${data.source} · ${data.chunks} chunks` });
      onIndexed();
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  const statusColor =
    status.kind === "error"
      ? "text-red-600"
      : status.kind === "done"
        ? "text-emerald-600"
        : "text-neutral-500";

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-7 text-center transition ${
          dragging
            ? "border-neutral-900 bg-neutral-50"
            : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        <span className="text-sm font-medium text-neutral-700">
          {status.kind === "working" ? "Working…" : "Drop a file or click to upload"}
        </span>
        <span className="text-xs text-neutral-400">PDF, TXT, or Markdown</span>
      </label>
      {status.text && <p className={`mt-2 text-xs ${statusColor}`}>{status.text}</p>}
    </div>
  );
}
