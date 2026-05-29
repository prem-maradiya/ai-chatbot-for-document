"use client";

import { useState, useRef, FormEvent } from "react";

type Source = { index: number; source: string; similarity: number; snippet: string };
type Message = { role: "user" | "assistant"; content: string; sources?: Source[] };

export default function Chat({ onIndexed }: { onIndexed?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploadStatus(`Uploading and indexing "${file.name}"…`);
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setUploadStatus(`Indexed "${data.source}" (${data.chunks} chunks). Ask away!`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onIndexed?.();
    } catch (err) {
      setUploadStatus(err instanceof Error ? err.message : "Upload failed");
    }
  }

  // Apply a partial update to the last (assistant) message.
  function patchLast(patch: (m: Message) => Message) {
    setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = patch(next[next.length - 1]);
      return next;
    });
  }

  function handleFrame(line: string) {
    if (!line.trim()) return;
    let evt: { type: string; text?: string; message?: string; sources?: Source[] };
    try {
      evt = JSON.parse(line);
    } catch {
      return; // ignore malformed frame
    }
    if (evt.type === "sources") {
      patchLast((m) => ({ ...m, sources: evt.sources ?? [] }));
    } else if (evt.type === "delta") {
      patchLast((m) => ({ ...m, content: m.content + (evt.text ?? "") }));
    } else if (evt.type === "error") {
      patchLast((m) => ({ ...m, content: m.content + `\n\n[Error: ${evt.message}]` }));
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setLoading(true);
    setMessages((m) => [
      ...m,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });
      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // keep the partial last line
        for (const line of lines) handleFrame(line);
      }
      if (buffer) handleFrame(buffer); // flush any trailing frame
    } catch (err) {
      patchLast((m) => ({
        ...m,
        content: err instanceof Error ? err.message : "Something went wrong",
      }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Upload */}
      <form
        onSubmit={handleUpload}
        className="flex items-center gap-2 rounded-lg border border-gray-200 p-3"
      >
        <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md" className="flex-1 text-sm" />
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700"
        >
          Upload
        </button>
      </form>
      {uploadStatus && <p className="text-xs text-gray-500">{uploadStatus}</p>}

      {/* Messages */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400">
            No messages yet. Upload a document and ask a question.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user" ? "flex flex-col items-end" : "flex flex-col items-start"
            }
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {m.content || (loading ? "…" : "")}
            </div>

            {m.role === "assistant" && m.sources && m.sources.length > 0 && (
              <details className="mt-1 max-w-[85%] text-xs text-gray-500">
                <summary className="cursor-pointer select-none hover:text-gray-700">
                  {m.sources.length} source{m.sources.length > 1 ? "s" : ""} used
                </summary>
                <ul className="mt-1 flex flex-col gap-1">
                  {m.sources.map((s) => (
                    <li key={s.index} className="rounded border border-gray-200 p-2">
                      <div className="font-medium text-gray-600">
                        [{s.index}] {s.source}{" "}
                        <span className="text-gray-400">· {(s.similarity * 100).toFixed(0)}% match</span>
                      </div>
                      <p className="mt-0.5 text-gray-500">{s.snippet}…</p>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your documents…"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
