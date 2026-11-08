"use client";

import React, { useState, useEffect } from "react";
import { Newspaper, ChevronLeft, ChevronRight, AlertTriangle, Shield, Heart, Skull, Zap, Radio } from "lucide-react";
import { MastermindNewsEvent } from "../../../../party/types";

interface NewsGazetteSlideshowProps {
  slides: MastermindNewsEvent[];
  round: number;
  timer: number;
  onProceedToNextRound?: () => void;
}

export const NewsGazetteSlideshow: React.FC<NewsGazetteSlideshowProps> = ({
  slides,
  round,
  timer,
  onProceedToNextRound,
}) => {
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  // Auto-advance slides every 3.5 seconds
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIdx((prev) => (prev + 1) % slides.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [slides.length]);

  const activeSlide = slides[currentSlideIdx] || {
    id: "def",
    headline: "Night Surveillance Reconnaissance",
    detail: "Autonomous sensors monitored facility sectors. No lethal breach detected.",
    icon: "📡",
    severity: "info",
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-6 bg-slate-950 text-white rounded-3xl border border-rose-500/30 shadow-2xl overflow-hidden select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-950/20 via-transparent to-transparent pointer-events-none" />

      {/* Top Gazette Banner */}
      <div className="w-full flex items-center justify-between border-b border-rose-500/20 pb-3 z-10">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 font-mono text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-rose-400" />
            <span>Phase 4: Facility News Gazette & Intel Slideshow</span>
          </div>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Round {round} Declassified Report • Identities Redacted
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Next Round in:</span>
          <span className="font-mono text-sm font-black text-rose-400">{timer}s</span>
        </div>
      </div>

      {/* Main Slideshow Stage */}
      <div className="w-full max-w-2xl my-auto flex flex-col items-center z-10">
        {/* Animated Anonymous Interaction Vignette */}
        <div className="relative w-full aspect-[16/9] rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-slate-800 p-6 flex flex-col items-center justify-between shadow-2xl overflow-hidden">
          {/* Subtle Sector Radar Background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <div className="w-72 h-72 rounded-full border border-cyan-400" />
            <div className="absolute w-48 h-48 rounded-full border border-cyan-400" />
          </div>

          {/* Severity Badge */}
          <div className="w-full flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider bg-rose-950/80 border border-rose-500/40 text-rose-300">
              {activeSlide.severity.toUpperCase()} TELEMETRY
            </span>
            <span className="text-xs font-mono text-slate-500">
              Slide {currentSlideIdx + 1} / {Math.max(1, slides.length)}
            </span>
          </div>

          {/* Animated Anonymous Operative Interaction Graphic */}
          <div className="flex items-center justify-center gap-8 my-4">
            {/* Anonymous Operative A */}
            <div className="flex flex-col items-center gap-1.5 animate-pulse">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-cyan-400/60 flex items-center justify-center text-3xl shadow-lg shadow-cyan-950">
                👤
              </div>
              <span className="text-[10px] font-mono text-slate-400 font-bold">
                [OPERATIVE REDACTED]
              </span>
            </div>

            {/* Action Beam / Interaction Particle */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl animate-bounce">{activeSlide.icon}</span>
              <div className="w-24 h-0.5 bg-gradient-to-r from-cyan-400 via-rose-500 to-amber-400 animate-pulse" />
            </div>

            {/* Anonymous Operative B */}
            <div className="flex flex-col items-center gap-1.5 animate-pulse">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-rose-400/60 flex items-center justify-center text-3xl shadow-lg shadow-rose-950">
                👤
              </div>
              <span className="text-[10px] font-mono text-slate-400 font-bold">
                [OPERATIVE REDACTED]
              </span>
            </div>
          </div>

          {/* Headline and Description */}
          <div className="text-center flex flex-col gap-1 z-10">
            <h3 className="text-base font-black text-white tracking-wide">
              {activeSlide.headline}
            </h3>
            <p className="text-xs text-slate-300 max-w-lg mx-auto font-mono">
              {activeSlide.detail}
            </p>
          </div>
        </div>

        {/* Slide Controls & Dots */}
        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={() =>
              setCurrentSlideIdx((prev) => (prev - 1 + slides.length) % slides.length)
            }
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlideIdx(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  currentSlideIdx === idx ? "bg-rose-400 scale-125" : "bg-slate-700"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentSlideIdx((prev) => (prev + 1) % slides.length)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-[10px] text-slate-500 font-mono text-center z-10">
        All night interactions are strictly anonymous. Forensics reveal only deployed tools, weapons, and medical events.
      </div>
    </div>
  );
};

