"use client";

import { useCallback, useState } from "react";
import Documents from "@/components/Documents";
import Chat from "@/components/Chat";

export default function Workspace() {
  // Bumped whenever the indexed set changes (upload or delete) so the
  // Documents list re-fetches.
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Documents version={version} onChange={reload} />
      <Chat onIndexed={reload} />
    </div>
  );
}
