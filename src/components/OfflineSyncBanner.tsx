import React, { useState, useEffect } from "react";
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload } from "lucide-react";
import { getOfflineQueueCount, syncOfflineQueue } from "@/utils/offlineQueue";
import { cn } from "@/lib/utils";

export function OfflineSyncBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const updateQueue = async () => {
    const count = await getOfflineQueueCount();
    setQueueCount(count);
  };

  useEffect(() => {
    updateQueue();

    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      await syncOfflineQueue();
      setIsSyncing(false);
      updateQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateQueue();
    };

    const handleQueueChange = () => {
      updateQueue();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("offline-queue-changed", handleQueueChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("offline-queue-changed", handleQueueChange);
    };
  }, []);

  if (isOnline && queueCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <aside
      aria-label="Offline Sync Status"
      className={cn(
        "fixed top-3 left-1/2 -translate-x-1/2 z-[250] flex items-center gap-2.5 px-4 py-1.5 rounded-full shadow-lg border backdrop-blur-md text-xs font-semibold select-none transition-all duration-300 animate-in fade-in slide-in-from-top-3",
        !isOnline
          ? "bg-amber-500/90 text-slate-950 border-amber-400/60 shadow-[0_8px_25px_rgba(245,158,11,0.35)]"
          : "bg-emerald-600/90 text-white border-emerald-400/50 shadow-[0_8px_25px_rgba(16,185,129,0.3)]"
      )}
    >
      {!isOnline ? (
        <>
          <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse shrink-0" />
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>Offline Mode Active</span>
          {queueCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-950/20 text-[10px] font-mono font-bold">
              {queueCount} Queued Locally
            </span>
          )}
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>Syncing {queueCount} Transaction(s) to Cloud...</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
          <span>Back Online • All Data Synced</span>
        </>
      )}

      {isOnline && queueCount > 0 && !isSyncing && (
        <button
          type="button"
          onClick={async () => {
            setIsSyncing(true);
            await syncOfflineQueue();
            setIsSyncing(false);
          }}
          className="ml-1 px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-[10px] font-mono cursor-pointer flex items-center gap-1"
        >
          <CloudUpload className="w-3 h-3" /> Sync Now
        </button>
      )}
    </aside>
  );
}
