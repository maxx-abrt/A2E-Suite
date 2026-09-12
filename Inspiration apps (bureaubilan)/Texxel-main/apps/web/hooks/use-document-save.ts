"use client";
import { useEffect, useMemo, useRef, useState } from "react";
/** One serial save queue per document. Debounced edits cannot report Saved prematurely. */
export function useDocumentSave(documentId: string) {
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const mounted = useRef(true);
  const activeId = useRef(documentId); activeId.current = documentId;
  const queue = useMemo(() => {
    const pending = new Map<string, () => Promise<unknown>>();
    let timer: ReturnType<typeof setTimeout> | undefined, running = false;
    const notify = (state: "saved" | "saving" | "error") => { if (mounted.current && activeId.current === documentId) setStatus(state); };
    const flush = async () => {
      clearTimeout(timer);
      if (running) return;
      running = true;
      while (pending.size) {
        const [key, work] = pending.entries().next().value!;
        pending.delete(key);
        try { await work(); }
        catch { if (!pending.has(key)) pending.set(key, work); running = false; notify("error"); return; }
      }
      running = false; notify("saved");
    };
    return {
      enqueue(key: string, work: () => Promise<unknown>) { pending.set(key, work); notify("saving"); clearTimeout(timer); timer = setTimeout(flush, 550); },
      retry() { notify("saving"); void flush(); },
      flush, isPending: () => running || pending.size > 0,
    };
  }, [documentId]);
  useEffect(() => {
    mounted.current = true; setStatus("saved");
    const unload = (e: BeforeUnloadEvent) => { if (queue.isPending()) { e.preventDefault(); e.returnValue = ""; } };
    const hidden = () => { if (document.visibilityState === "hidden") void queue.flush(); };
    const online = () => { if (queue.isPending()) queue.retry(); };
    window.addEventListener("beforeunload", unload); document.addEventListener("visibilitychange", hidden); window.addEventListener("online", online);
    return () => { mounted.current = false; void queue.flush(); window.removeEventListener("beforeunload", unload); document.removeEventListener("visibilitychange", hidden); window.removeEventListener("online", online); };
  }, [queue]);
  return { ...queue, status };
}
