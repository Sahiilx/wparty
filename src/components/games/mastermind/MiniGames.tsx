"use client";

import React, { useState, useEffect } from "react";
import { Lock, Unlock, ChevronUp, ChevronDown, Check, AlertTriangle, Zap, DollarSign, Clock } from "lucide-react";

// ============================================================================
// 1. Vertical Wheel Letter-Scramble Cipher
// ============================================================================
interface CipherMiniGameProps {
  onSuccess: () => void;
  onFail?: () => void;
  targetWord?: string;
  timeLimit?: number; // seconds
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const VerticalWheelCipher: React.FC<CipherMiniGameProps> = ({
  onSuccess,
  onFail,
  targetWord = "LOCK",
  timeLimit = 25,
}) => {
  const lettersCount = targetWord.length;
  // Initialize with scrambled positions
  const [wheelIndices, setWheelIndices] = useState<number[]>(() =>
    targetWord.split("").map((_, i) => (ALPHABET.indexOf(targetWord[i]) + 3 + i * 5) % 26)
  );
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    if (solved || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          if (onFail) onFail();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [solved, timeLeft, onFail]);

  const rotateWheel = (index: number, direction: 1 | -1) => {
    if (solved) return;
    setWheelIndices((prev) => {
      const next = [...prev];
      next[index] = (next[index] + direction + 26) % 26;
      return next;
    });
  };

  // Check solution on change
  useEffect(() => {
    const currentWord = wheelIndices.map((idx) => ALPHABET[idx]).join("");
    if (currentWord === targetWord && !solved) {
      setSolved(true);
      setTimeout(() => onSuccess(), 800);
    }
  }, [wheelIndices, targetWord, solved, onSuccess]);

  return (
    <div className="flex flex-col items-center justify-between p-4 bg-slate-950/95 border border-cyan-500/40 rounded-2xl shadow-2xl w-full max-w-md mx-auto">
      <div className="w-full flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          {solved ? <Unlock className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-cyan-400" />}
          <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
            Terminal Decryption Cylinder
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-xs text-amber-400 font-bold">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mb-3 text-center">
        Align the vertical letter rings to spell: <strong className="text-cyan-400 font-mono tracking-widest">{targetWord}</strong>
      </p>

      {/* Vertical Rotating Cylinders */}
      <div className="flex items-center justify-center gap-3 py-2 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 shadow-inner">
        {wheelIndices.map((currentIdx, wheelIdx) => {
          const prevLetter = ALPHABET[(currentIdx - 1 + 26) % 26];
          const currLetter = ALPHABET[currentIdx];
          const nextLetter = ALPHABET[(currentIdx + 1) % 26];

          return (
            <div key={wheelIdx} className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => rotateWheel(wheelIdx, -1)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white transition-all"
              >
                <ChevronUp className="w-4 h-4" />
              </button>

              <div className="relative flex flex-col items-center justify-center w-12 h-24 bg-slate-950 rounded-xl border border-cyan-500/30 overflow-hidden font-mono font-black shadow-lg">
                <span className="text-xs text-slate-600 select-none opacity-40">{prevLetter}</span>
                <span className="text-lg text-cyan-300 select-none my-1 py-0.5 px-2 bg-cyan-950/60 rounded border border-cyan-500/40">
                  {currLetter}
                </span>
                <span className="text-xs text-slate-600 select-none opacity-40">{nextLetter}</span>
              </div>

              <button
                type="button"
                onClick={() => rotateWheel(wheelIdx, 1)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white transition-all"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {solved && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-400 animate-fade-in">
          <Check className="w-4 h-4" />
          <span>CYLINDER DECRYPTED! OVERRIDE GRANTED</span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. Mathematically Modified Average-Bidding Terminal (The Devil's Plan 0.8x)
// ============================================================================
interface AverageBiddingMiniGameProps {
  onComplete: (result: {
    userBid: number;
    average: number;
    target: number;
    isWinner: boolean;
    reward: string;
    penaltyUser?: string;
  }) => void;
  simulatedOtherBids?: { id: string; name: string; bid: number }[];
}

export const AverageBiddingTerminal: React.FC<AverageBiddingMiniGameProps> = ({
  onComplete,
  simulatedOtherBids = [
    { id: "agent_b", name: "Agent Beta (Killer)", bid: 35 },
    { id: "agent_c", name: "Agent Gamma (Doctor)", bid: 42 },
    { id: "agent_d", name: "Agent Delta (Soldier)", bid: 28 },
    { id: "agent_e", name: "Agent Epsilon (Thief)", bid: 19 },
  ],
}) => {
  const [userBid, setUserBid] = useState<number>(30);
  const [submitted, setSubmitted] = useState(false);
  const [resolution, setResolution] = useState<{
    allBids: { name: string; bid: number; diff: number }[];
    avg: number;
    target: number;
    winnerName: string;
    farthestName: string;
  } | null>(null);

  const handleSubmitBid = () => {
    setSubmitted(true);

    const allBidsList = [
      { name: "You", bid: userBid },
      ...simulatedOtherBids.map((b) => ({ name: b.name, bid: b.bid })),
    ];

    const total = allBidsList.reduce((acc, curr) => acc + curr.bid, 0);
    const avg = Math.round((total / allBidsList.length) * 10) / 10;
    const target = Math.round(avg * 0.8 * 10) / 10;

    const evaluated = allBidsList.map((b) => ({
      name: b.name,
      bid: b.bid,
      diff: Math.abs(b.bid - target),
    }));

    evaluated.sort((a, b) => a.diff - b.diff);

    const winner = evaluated[0];
    const farthest = evaluated[evaluated.length - 1];

    setResolution({
      allBids: evaluated,
      avg,
      target,
      winnerName: winner.name,
      farthestName: farthest.name,
    });

    setTimeout(() => {
      onComplete({
        userBid,
        average: avg,
        target,
        isWinner: winner.name === "You",
        reward: "High-Tier Quantum Battery & Terminal Overdrive",
        penaltyUser: farthest.name,
      });
    }, 3500);
  };

  return (
    <div className="flex flex-col items-center justify-between p-4 bg-slate-950/95 border border-purple-500/40 rounded-2xl shadow-2xl w-full max-w-md mx-auto select-none">
      <div className="w-full flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-black uppercase tracking-wider text-purple-300">
            Modified Average Bidding Terminal
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
          The Devil's Plan
        </span>
      </div>

      <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl text-xs text-purple-200 leading-relaxed mb-3">
        <strong>The 0.8 Rule:</strong> Every participant secretly bids <strong>0 to 100</strong>. The target number is calculated as <strong>80% of the Group Average</strong>. Closest bid wins the scrap cache; farthest is revealed on the mini-map!
      </div>

      {!submitted ? (
        <div className="w-full flex flex-col items-center gap-4 my-2">
          <div className="text-center">
            <span className="text-xs text-slate-400 block mb-1">Your Secret Numerical Bid</span>
            <span className="text-4xl font-mono font-black text-amber-400">{userBid}</span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={userBid}
            onChange={(e) => setUserBid(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />

          <button
            type="button"
            onClick={handleSubmitBid}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all hover:scale-105 active:scale-95"
          >
            Lock Secret Bid ({userBid})
          </button>
        </div>
      ) : resolution ? (
        <div className="w-full flex flex-col gap-2.5 text-xs animate-fade-in my-1">
          <div className="grid grid-cols-2 gap-2 text-center p-2.5 bg-slate-900 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 block">Group Average</span>
              <span className="font-mono font-bold text-slate-200">{resolution.avg}</span>
            </div>
            <div>
              <span className="text-[10px] text-purple-400 font-bold block">80% Target</span>
              <span className="font-mono font-black text-amber-400">{resolution.target}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 p-2 bg-slate-900/80 rounded-xl border border-slate-800/80 max-h-36 overflow-y-auto">
            {resolution.allBids.map((b, i) => (
              <div key={i} className="flex items-center justify-between p-1 text-[11px]">
                <span className={b.name === "You" ? "text-cyan-400 font-bold" : "text-slate-300"}>{b.name}</span>
                <span className="font-mono text-slate-400">Bid: {b.bid} (Δ {Math.round(b.diff * 10) / 10})</span>
              </div>
            ))}
          </div>

          <div className="p-2 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-center font-bold text-emerald-300 text-xs">
            🏆 Winner: {resolution.winnerName}
          </div>
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-purple-400 font-semibold animate-pulse">
          Calculating 80% Average Algorithm...
        </div>
      )}
    </div>
  );
};

