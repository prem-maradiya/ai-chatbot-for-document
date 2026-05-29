"use client";

import { useEffect, useRef, useState, FormEvent } from "react";

type Source = { index: number; source: string; similarity: number; snippet: string };
type Message = { role: "user" | "assistant"; content: string; sources?: Source[] };

const EXAMPLES = [
  "Summarize the key points",
  "What are the main conclusions?",
  "List any important dates or figures",
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the latest message in view as tokens stream in.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

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
    if (evt.type === "sources") patchLast((m) => ({ ...m, sources: evt.sources ?? [] }));
    else if (evt.type === "delta") patchLast((m) => ({ ...m, content: m.content + (evt.text ?? "") }));
    else if (evt.type === "error")
      patchLast((m) => ({ ...m, content: m.content + `\n\n[Error: ${evt.message}]` }));
  }

  async function send(question: string) {
    if (!question.trim() || loading) return;
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
      if (buffer) handleFrame(buffer); // flush trailing frame
    } catch (err) {
      patchLast((m) => ({
        ...m,
        content: err instanceof Error ? err.message : "Something went wrong",
      }));
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input.trim());
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          {messages.length === 0 ? (
            <div className="mt-12 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
                Ask anything about your documents
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-500">
                Every answer is generated only from the files in your knowledge base, with
                citations you can verify.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => send(ex)}
                    className="rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-sm text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "flex flex-col items-end" : "flex flex-col items-start"}
              >
                <div
                  className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-neutral-900 text-white"
                      : "border border-neutral-200 bg-white text-neutral-800"
                  }`}
                >
                  {m.content || (loading ? <TypingDots /> : "")}
                </div>

                {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                  <details className="mt-2 w-full max-w-[90%]">
                    <summary className="cursor-pointer select-none text-xs font-medium text-neutral-400 transition hover:text-neutral-600">
                      {m.sources.length} source{m.sources.length > 1 ? "s" : ""}
                    </summary>
                    <ul className="mt-2 flex flex-col gap-2">
                      {m.sources.map((s) => (
                        <li
                          key={s.index}
                          className="rounded-lg border border-neutral-200 bg-white p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate text-xs font-medium text-neutral-700">
                              {s.source}
                            </span>
                            <span className="ml-2 shrink-0 font-mono text-[11px] text-neutral-400">
                              {(s.similarity * 100).toFixed(0)}%
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                            {s.snippet}…
                          </p>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-neutral-200 bg-white px-4 py-4 md:px-8">
        <form onSubmit={onSubmit} className="mx-auto flex max-w-2xl items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm outline-none transition focus:border-neutral-400 focus:bg-white focus:ring-4 focus:ring-neutral-900/5"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </form>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-neutral-400">
          Answers are grounded in your uploaded documents.
        </p>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" />
    </span>
  );
}
