"use client";

import { useCallback, useState } from "react";
import Uploader from "@/components/Uploader";
import Documents from "@/components/Documents";
import Chat from "@/components/Chat";

export default function Workspace() {
  // Bumped whenever the indexed set changes (upload or delete) so the
  // Documents list re-fetches.
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white/80 px-5 py-3 backdrop-blur-sm">
        <div className="flex items-baseline gap-1">
          <span className="text-[15px] font-semibold tracking-tight">Sourced</span>
          <span className="h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-neutral-900" />
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Ready
        </span>
      </header>

      {/* Body: sidebar + chat */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex w-full shrink-0 flex-col gap-5 border-b border-neutral-200 bg-white p-5 md:max-h-none md:w-80 md:border-b-0 md:border-r">
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Knowledge base
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Upload documents to ground every answer.
            </p>
          </div>
          <Uploader onIndexed={reload} />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Documents version={version} onChange={reload} />
          </div>
        </aside>

        <main className="flex min-h-0 flex-1 flex-col">
          <Chat />
        </main>
      </div>
    </div>
  );
}
