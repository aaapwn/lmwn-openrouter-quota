"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

// Re-renders the server component (which re-fetches on the server). The browser
// itself never calls OpenRouter or any API route: router.refresh() only asks
// this app to render the page again.
export function AutoRefresh({ everySeconds = 60 }: { everySeconds?: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [left, setLeft] = useState(everySeconds);
  const deadline = useRef(0);

  // Called only from event handlers / timers, never from a state updater or render.
  const refresh = useCallback(() => {
    deadline.current = Date.now() + everySeconds * 1000;
    setLeft(everySeconds);
    start(() => router.refresh());
  }, [router, everySeconds]);

  useEffect(() => {
    deadline.current = Date.now() + everySeconds * 1000;
    const id = setInterval(() => {
      const secs = Math.ceil((deadline.current - Date.now()) / 1000);
      if (secs <= 0) refresh();
      else setLeft(secs);
    }, 1000);
    return () => clearInterval(id);
  }, [refresh, everySeconds]);

  return (
    <button type="button" className="refresh" disabled={pending} onClick={refresh}>
      {pending ? "กำลังโหลด…" : `รีเฟรช (อัตโนมัติใน ${left}s)`}
    </button>
  );
}
