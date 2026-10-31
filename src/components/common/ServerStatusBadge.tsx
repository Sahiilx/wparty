"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Wifi, WifiOff, Loader2, Sparkles, RefreshCw } from "lucide-react";

interface ServerStatusBadgeProps {
  compact?: boolean;
}

export function ServerStatusBadge({ compact = false }: ServerStatusBadgeProps) {
  const [status, setStatus] = useState<"checking" | "online" | "waking" | "offline">("checking");
  const [latency, setLatency] = useState<number | null>(null);
  const [wakeCountdown, setWakeCountdown] = useState<number>(30);

  const checkHealth = useCallback(async () => {
    const t0 = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch("/api/health", {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);

      const t1 = performance.now();
      const roundTrip = Math.round(t1 - t0);

      if (res.ok) {
        setStatus("online");
        setLatency(roundTrip);
      } else {
        setStatus("waking");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setStatus("waking");
      } else {
        setStatus("offline");
      }
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Countdown timer when waking up from Render sleep
  useEffect(() => {
    if (status !== "waking") {
      setWakeCountdown(30);
      return;
    }

    const timer = setInterval(() => {
      setWakeCountdown((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  if (compact) {
    if (status === "online") {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold shadow"
          title={`Server is active! Latency: ${latency}ms`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Server Live {latency ? `· ${latency}ms` : ""}</span>
        </span>
      );
    }

    if (status === "waking") {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/70 border border-amber-500/50 text-amber-300 text-[11px] font-bold shadow animate-pulse"
          title="Server is spinning up from sleep mode..."
        >
          <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
          <span>Waking Server (~{wakeCountdown}s)</span>
        </span>
      );
    }

    if (status === "offline") {
      return (
        <button
          onClick={checkHealth}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/70 border border-rose-500/50 text-rose-300 text-[11px] font-bold hover:bg-rose-900/60 transition-all shadow"
          title="Click to ping and wake up server"
        >
          <WifiOff className="w-3 h-3 text-rose-400" />
          <span>Server Idle · Tap to Wake</span>
        </button>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-[11px] font-semibold">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Checking Server...</span>
      </span>
    );
  }

  // Expanded banner (used on homepage or connecting screen)
  return (
    <div className="w-full flex items-center justify-between p-2.5 px-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow text-xs">
      <div className="flex items-center gap-2">
        {status === "online" && (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="font-bold text-emerald-300">
              Multiplayer Server Live & Ready {latency ? `(${latency}ms)` : ""}
            </span>
          </>
        )}

        {status === "waking" && (
          <>
            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <div className="flex flex-col text-left">
              <span className="font-bold text-amber-300">
                Waking server from sleep... (~{wakeCountdown}s)
              </span>
              <span className="text-[10px] text-slate-400">
                Render free servers sleep after inactivity. It will stay fast once awake!
              </span>
            </div>
          </>
        )}

        {status === "offline" && (
          <>
            <WifiOff className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-bold text-rose-300">Server Idle / Asleep</span>
          </>
        )}

        {status === "checking" && (
          <>
            <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
            <span className="font-medium text-slate-400">Verifying game server status...</span>
          </>
        )}
      </div>

      <button
        onClick={checkHealth}
        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        title="Refresh Server Ping"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

