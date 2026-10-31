"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, CheckCircle2, AlertCircle, MessageSquare, ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";
import { ChatMessage } from "../../../party/types";

interface PartyChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, targetBoard?: "1" | "2") => void;
  placeholder?: string;
  isDrawer?: boolean;
  onCycleWidth?: () => void;
  widthLabel?: string;
}

const ZOOM_LEVELS = [
  { scale: 0.75, label: "75%", textClass: "text-[11px]", py: "py-0.5" },
  { scale: 0.88, label: "88%", textClass: "text-xs", py: "py-1" },
  { scale: 1.0, label: "100%", textClass: "text-sm", py: "py-1.5" },
  { scale: 1.15, label: "115%", textClass: "text-base", py: "py-2" },
  { scale: 1.3, label: "130%", textClass: "text-lg", py: "py-2.5" },
];

export function PartyChat({
  messages,
  onSendMessage,
  placeholder,
  isDrawer,
  onCycleWidth,
  widthLabel,
}: PartyChatProps) {
  const [input, setInput] = useState("");
  const [zoomIdx, setZoomIdx] = useState(2); // default 100%
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("party_chat_zoom_idx");
    if (saved) {
      const idx = parseInt(saved, 10);
      if (!isNaN(idx) && idx >= 0 && idx < ZOOM_LEVELS.length) {
        setZoomIdx(idx);
      }
    }
  }, []);

  const changeZoom = (delta: number) => {
    setZoomIdx((prev) => {
      const next = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, prev + delta));
      localStorage.setItem("party_chat_zoom_idx", String(next));
      return next;
    });
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isDrawer) return;
    onSendMessage(input);
    setInput("");
  };

  const currentZoom = ZOOM_LEVELS[zoomIdx];

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-all">
      {/* Chat Header & Modular Zoom Controls */}
      <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Chat & Guesses</span>
        </div>

        {/* Modular Zoom Toolbar */}
        <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => changeZoom(-1)}
            disabled={zoomIdx === 0}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
            title="Zoom Out Chat (Smaller text)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-[10px] font-mono font-bold text-indigo-300 px-1 select-none">
            {currentZoom.label}
          </span>

          <button
            type="button"
            onClick={() => changeZoom(1)}
            disabled={zoomIdx === ZOOM_LEVELS.length - 1}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
            title="Zoom In Chat (Larger text)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {onCycleWidth && (
            <button
              type="button"
              onClick={onCycleWidth}
              className="ml-1 pl-1 border-l border-slate-800 text-[10px] font-bold text-slate-400 hover:text-indigo-300 px-1 py-0.5 rounded flex items-center gap-0.5"
              title="Resize Chat Panel Width"
            >
              <span>{widthLabel || "Width"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area with Dynamic Text Zoom */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 text-xs py-8">
            No messages yet. Say hi or type guesses here!
          </div>
        )}

        {messages.map((msg) => {
          if (msg.type === "guess_correct") {
            return (
              <div
                key={msg.id}
                className={`p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2 font-medium ${currentZoom.textClass}`}
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong className="text-emerald-300">{msg.senderName}</strong> {msg.text}
                </span>
              </div>
            );
          }

          if (msg.type === "guess_close") {
            return (
              <div
                key={msg.id}
                className={`p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-2 font-medium ${currentZoom.textClass}`}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{msg.text}</span>
              </div>
            );
          }

          if (msg.type === "system") {
            return (
              <div key={msg.id} className="text-center text-[11px] text-slate-500 py-0.5 italic">
                {msg.text}
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex flex-col ${currentZoom.py}`}>
              <span className="text-[10px] font-semibold text-indigo-400">{msg.senderName}</span>
              <span className={`text-slate-200 break-words leading-snug ${currentZoom.textClass}`}>
                {msg.text}
              </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="p-2.5 bg-slate-950/80 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={input}
          disabled={isDrawer}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isDrawer
              ? "You are host/drawing! Chat disabled."
              : placeholder || "Type guess or chat..."
          }
          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || isDrawer}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl transition-all"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
