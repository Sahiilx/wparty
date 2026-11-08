"use client";

import React, { useState, useEffect, useRef } from "react";
import { Zap, Lock, Unlock, AlertTriangle, CheckCircle2, Trophy, Clock, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";

// ============================================================================
// 1. The Power Split (Resource Partitioning & Game Theory)
// ============================================================================
interface PowerSplitProps {
  onComplete: (coinsEarned: number, score: number) => void;
  initialMW?: number;
}

export const PowerSplitMiniGame: React.FC<PowerSplitProps> = ({ onComplete, initialMW = 100 }) => {
  const [round, setRound] = useState(1);
  const [totalMW, setTotalMW] = useState(initialMW);
  const [nodeA, setNodeA] = useState(0);
  const [nodeB, setNodeB] = useState(0);
  const [nodeC, setNodeC] = useState(0);
  const [timeLeft, setTimeLeft] = useState(35);
  const [totalScore, setTotalScore] = useState(0);
  const [roundLog, setRoundLog] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const currentAllocation = nodeA + nodeB + nodeC;
  const remainingMW = totalMW - currentAllocation;

  // Node Targets for each of the 3 mini-rounds
  const NODE_TARGETS = [
    { a: 80, b: 50, c: 30 },
    { a: 100, b: 60, c: 40 },
    { a: 120, b: 75, c: 50 },
  ][round - 1] || { a: 80, b: 50, c: 30 };

  useEffect(() => {
    if (isFinished) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleLockAllocation();
          return 35;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [round, nodeA, nodeB, nodeC, totalMW, isFinished]);

  const handleLockAllocation = () => {
    // Simulated rival operatives' power commitments
    const rivalA = Math.floor(Math.random() * (totalMW * 0.45));
    const rivalB = Math.floor(Math.random() * (totalMW * 0.35));
    const rivalC = Math.floor(Math.random() * (totalMW * 0.25));

    let roundPoints = 0;
    const logEntries: string[] = [];

    // Node A Calculation
    if (nodeA > rivalA) {
      roundPoints += NODE_TARGETS.a;
      logEntries.push(`⚡ Node A WON! (Your ${nodeA} MW vs Rival ${rivalA} MW) -> +${NODE_TARGETS.a} pts`);
    } else {
      logEntries.push(`❌ Node A Out-bid (Your ${nodeA} MW vs Rival ${rivalA} MW)`);
    }

    // Node B Calculation
    if (nodeB > rivalB) {
      roundPoints += NODE_TARGETS.b;
      logEntries.push(`⚡ Node B WON! (Your ${nodeB} MW vs Rival ${rivalB} MW) -> +${NODE_TARGETS.b} pts`);
    } else {
      logEntries.push(`❌ Node B Out-bid (Your ${nodeB} MW vs Rival ${rivalB} MW)`);
    }

    // Node C Calculation
    if (nodeC > rivalC) {
      roundPoints += NODE_TARGETS.c;
      logEntries.push(`⚡ Node C WON! (Your ${nodeC} MW vs Rival ${rivalC} MW) -> +${NODE_TARGETS.c} pts`);
    } else {
      logEntries.push(`❌ Node C Out-bid (Your ${nodeC} MW vs Rival ${rivalC} MW)`);
    }

    const newTotalMW = Math.max(0, totalMW - currentAllocation);
    const newScore = totalScore + roundPoints;
    setTotalScore(newScore);
    setTotalMW(newTotalMW);
    setRoundLog((prev) => [...logEntries, ...prev]);

    // Reset allocation inputs
    setNodeA(0);
    setNodeB(0);
    setNodeC(0);

    if (round < 3) {
      setRound((r) => r + 1);
      setTimeLeft(35);
    } else {
      setIsFinished(true);
      const coinsEarned = Math.round(Math.max(25, Math.min(150, (newScore / 250) * 120)));
      setTimeout(() => {
        onComplete(coinsEarned, newScore);
      }, 2500);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between p-6 bg-slate-950/90 border border-amber-500/30 rounded-3xl backdrop-blur-xl shadow-2xl text-white max-w-2xl mx-auto w-full">
      {/* Header Bar */}
      <div className="w-full flex items-center justify-between border-b border-amber-500/20 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-wider text-amber-300 uppercase">
              The Power Split: Resource Partitioning
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Stage {round} / 3 • Allocate Megawatts secretly to out-budget rivals
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="font-mono text-sm font-bold text-amber-300">{timeLeft}s</span>
        </div>
      </div>

      {/* MW Pool Tracker */}
      <div className="w-full grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-xs font-bold text-slate-400 uppercase">Total Secret Power Pool</span>
          <span className="text-3xl font-black text-amber-400 mt-1">{totalMW} <span className="text-sm font-normal text-slate-400">MW</span></span>
          <span className="text-[10px] text-slate-500 mt-1">⚠️ Power spent is burned forever!</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-xs font-bold text-slate-400 uppercase">Accumulated Points</span>
          <span className="text-3xl font-black text-emerald-400 mt-1">{totalScore} <span className="text-sm font-normal text-slate-400">PTS</span></span>
          <span className="text-[10px] text-emerald-400/80 mt-1">Est. Payout: ~{Math.round((totalScore / 250) * 120)} Coins</span>
        </div>
      </div>

      {/* 3 Node Targets */}
      <div className="w-full grid grid-cols-3 gap-3 mb-6">
        {/* Node A */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-rose-950/40 to-slate-900 border border-rose-500/40 flex flex-col items-center">
          <span className="text-xs font-bold text-rose-300 uppercase">Node Alpha</span>
          <span className="text-2xl font-black text-white my-1">{NODE_TARGETS.a} <span className="text-xs font-normal text-rose-400">PTS</span></span>
          <div className="w-full flex items-center justify-between gap-1 mt-3">
            <button
              onClick={() => setNodeA((v) => Math.max(0, v - 5))}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold"
            >
              -5
            </button>
            <span className="font-mono text-sm font-black text-amber-400">{nodeA} MW</span>
            <button
              onClick={() => remainingMW >= 5 && setNodeA((v) => v + 5)}
              disabled={remainingMW < 5}
              className="px-2 py-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 rounded-lg text-xs font-bold"
            >
              +5
            </button>
          </div>
        </div>

        {/* Node B */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-sky-950/40 to-slate-900 border border-sky-500/40 flex flex-col items-center">
          <span className="text-xs font-bold text-sky-300 uppercase">Node Beta</span>
          <span className="text-2xl font-black text-white my-1">{NODE_TARGETS.b} <span className="text-xs font-normal text-sky-400">PTS</span></span>
          <div className="w-full flex items-center justify-between gap-1 mt-3">
            <button
              onClick={() => setNodeB((v) => Math.max(0, v - 5))}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold"
            >
              -5
            </button>
            <span className="font-mono text-sm font-black text-amber-400">{nodeB} MW</span>
            <button
              onClick={() => remainingMW >= 5 && setNodeB((v) => v + 5)}
              disabled={remainingMW < 5}
              className="px-2 py-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-30 rounded-lg text-xs font-bold"
            >
              +5
            </button>
          </div>
        </div>

        {/* Node C */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-950/40 to-slate-900 border border-emerald-500/40 flex flex-col items-center">
          <span className="text-xs font-bold text-emerald-300 uppercase">Node Gamma</span>
          <span className="text-2xl font-black text-white my-1">{NODE_TARGETS.c} <span className="text-xs font-normal text-emerald-400">PTS</span></span>
          <div className="w-full flex items-center justify-between gap-1 mt-3">
            <button
              onClick={() => setNodeC((v) => Math.max(0, v - 5))}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold"
            >
              -5
            </button>
            <span className="font-mono text-sm font-black text-amber-400">{nodeC} MW</span>
            <button
              onClick={() => remainingMW >= 5 && setNodeC((v) => v + 5)}
              disabled={remainingMW < 5}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 rounded-lg text-xs font-bold"
            >
              +5
            </button>
          </div>
        </div>
      </div>

      {/* Commit Allocation Action */}
      <div className="w-full flex items-center justify-between p-3 bg-slate-900/90 border border-slate-800 rounded-2xl mb-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-300">
            Selected MW Spend: <span className="text-amber-400 font-mono">{currentAllocation} MW</span>
          </span>
          <span className="text-[10px] text-slate-400">
            Remaining for future stages: <span className="text-emerald-400 font-mono">{remainingMW} MW</span>
          </span>
        </div>
        <button
          onClick={handleLockAllocation}
          disabled={isFinished}
          className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-600/30"
        >
          {round < 3 ? "Lock Stage Partition" : "Submit Final Partition"}
        </button>
      </div>

      {/* Round Resolution Log */}
      {roundLog.length > 0 && (
        <div className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800/80 max-h-24 overflow-y-auto font-mono text-[11px] text-slate-300 flex flex-col gap-1">
          {roundLog.slice(0, 4).map((entry, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span>{entry}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. Cyber Cipher (Holographic Vertical Letter Wheels)
// ============================================================================
interface CyberCipherProps {
  onComplete: (coinsEarned: number, score: number) => void;
}

const CIPHER_WORDS = [
  "LOCK",
  "VAULT",
  "CIPHER",
  "REACTOR",
  "TERMINAL",
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const CyberCipherMiniGame: React.FC<CyberCipherProps> = ({ onComplete }) => {
  const [wordIndex, setWordIndex] = useState(0);
  const targetWord = CIPHER_WORDS[wordIndex] || "SECURITY";
  const [currentWheels, setCurrentWheels] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);

  // Initialize randomized wheels for the current word
  useEffect(() => {
    const letters = targetWord.split("").map((correctLetter) => {
      // Pick a random letter that isn't the correct one initially
      let r = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      return r;
    });
    setCurrentWheels(letters);
  }, [wordIndex, targetWord]);

  // Main countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleFinish();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [score]);

  // 3-second lockout penalty timer
  useEffect(() => {
    if (!isLockedOut) return;
    const interval = setInterval(() => {
      setLockoutTimer((t) => {
        if (t <= 1) {
          setIsLockedOut(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isLockedOut]);

  const cycleLetter = (idx: number, direction: 1 | -1) => {
    if (isLockedOut) return;
    setCurrentWheels((prev) => {
      const next = [...prev];
      const currentCh = next[idx] || "A";
      let alphaIdx = ALPHABET.indexOf(currentCh);
      alphaIdx = (alphaIdx + direction + 26) % 26;
      next[idx] = ALPHABET[alphaIdx];
      return next;
    });
  };

  const handleVerify = () => {
    if (isLockedOut) return;
    const formedWord = currentWheels.join("");
    if (formedWord === targetWord) {
      const addedPoints = 25 * (wordIndex + 1);
      const newScore = score + addedPoints;
      setScore(newScore);

      if (wordIndex + 1 < CIPHER_WORDS.length) {
        setWordIndex((w) => w + 1);
      } else {
        handleFinish(newScore + 50); // Speed completion bonus
      }
    } else {
      // Anti-spam 3-second lockout penalty!
      setIsLockedOut(true);
      setLockoutTimer(3);
    }
  };

  const handleFinish = (finalScore = score) => {
    const coinsEarned = Math.round(Math.max(25, Math.min(180, (finalScore / 250) * 140)));
    onComplete(coinsEarned, finalScore);
  };

  return (
    <div className="flex flex-col items-center justify-between p-6 bg-slate-950/90 border border-cyan-500/30 rounded-3xl backdrop-blur-xl shadow-2xl text-white max-w-2xl mx-auto w-full">
      {/* Header Bar */}
      <div className="w-full flex items-center justify-between border-b border-cyan-500/20 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
            <Lock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-wider text-cyan-300 uppercase">
              Cyber Cipher: Decrypt Race
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Word {wordIndex + 1} / {CIPHER_WORDS.length} • Align vertical letter wheels to decode
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-sm font-bold text-cyan-300">{timeLeft}s</span>
        </div>
      </div>

      {/* Target Word Hint / Progress */}
      <div className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase">Target Word:</span>
          <span className="text-base font-black text-cyan-400 tracking-widest">{targetWord}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase">Decrypted Bounty:</span>
          <span className="text-base font-black text-emerald-400 font-mono">+{score} Coins</span>
        </div>
      </div>

      {/* Vertical Holographic Wheels */}
      <div className="relative w-full flex items-center justify-center gap-2 sm:gap-3 py-6 px-4 bg-slate-900/60 border border-cyan-500/20 rounded-3xl mb-6 overflow-hidden">
        {/* Central Alignment Bar */}
        <div className="absolute inset-x-0 h-14 bg-cyan-500/10 border-y border-cyan-400/40 pointer-events-none z-10 backdrop-blur-[1px]" />

        {currentWheels.map((letter, idx) => (
          <div key={idx} className="flex flex-col items-center z-20">
            <button
              onClick={() => cycleLetter(idx, -1)}
              disabled={isLockedOut}
              className="p-1.5 text-slate-500 hover:text-cyan-400 disabled:opacity-30 transition-all hover:scale-110"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <div className="w-10 sm:w-12 h-14 rounded-2xl bg-slate-950 border border-cyan-500/40 flex items-center justify-center font-mono text-2xl font-black text-cyan-300 shadow-lg shadow-cyan-950/80">
              {letter}
            </div>
            <button
              onClick={() => cycleLetter(idx, 1)}
              disabled={isLockedOut}
              className="p-1.5 text-slate-500 hover:text-cyan-400 disabled:opacity-30 transition-all hover:scale-110"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>

      {/* Anti-Spam Lockout Banner */}
      {isLockedOut && (
        <div className="w-full p-2.5 rounded-2xl bg-rose-950/80 border border-rose-500/60 flex items-center justify-center gap-2 text-rose-300 text-xs font-black tracking-wide animate-pulse mb-4">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>SECURITY LOCKOUT PENALTY: Wait {lockoutTimer}s before next decrypt attempt!</span>
        </div>
      )}

      {/* Verify Decryption Action */}
      <button
        onClick={handleVerify}
        disabled={isLockedOut}
        className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-xl shadow-cyan-600/30 flex items-center justify-center gap-2"
      >
        <Unlock className="w-4 h-4" />
        <span>Transmit Decrypted Cipher</span>
      </button>
    </div>
  );
};

// ============================================================================
// 3. The 80% Leverage Pool (Tactical Price-Fixing & Decade Lockout)
// ============================================================================
interface LeveragePoolProps {
  onComplete: (coinsEarned: number, score: number) => void;
}

export const LeveragePoolMiniGame: React.FC<LeveragePoolProps> = ({ onComplete }) => {
  const [currentRound, setCurrentRound] = useState(1);
  const [bidValue, setBidValue] = useState<number>(50);
  const [burnedDecades, setBurnedDecades] = useState<number[]>([]); // e.g., 7 for 70-79
  const [targetPercentage, setTargetPercentage] = useState<number>(80); // dynamically 60% to 90%
  const [roundHistory, setRoundHistory] = useState<{
    round: number;
    myBid: number;
    avgBid: number;
    targetVal: number;
    won: boolean;
  }[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    // Generate dynamic target percentage for this round
    setTargetPercentage(Math.floor(65 + Math.random() * 25)); // 65% - 90%
  }, [currentRound]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleSubmitBid();
          return 30;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [bidValue, currentRound, burnedDecades]);

  const bidDecade = Math.floor(bidValue / 10);
  const isDecadeBurned = burnedDecades.includes(bidDecade);

  const handleSubmitBid = () => {
    if (isDecadeBurned) return;

    // Simulate rival bids
    const rivalBids = [
      Math.floor(20 + Math.random() * 70),
      Math.floor(20 + Math.random() * 70),
      Math.floor(20 + Math.random() * 70),
      Math.floor(20 + Math.random() * 70),
    ];
    const allBids = [...rivalBids, bidValue];
    const avg = allBids.reduce((a, b) => a + b, 0) / allBids.length;
    const target = (avg * targetPercentage) / 100;

    // Check if player's bid is closest
    const diff = Math.abs(bidValue - target);
    const won = diff <= 12; // Within safe threshold
    const pointsWon = won ? Math.round(100 - diff * 4) : 10;
    const newTotal = totalScore + pointsWon;
    setTotalScore(newTotal);

    setRoundHistory((prev) => [
      {
        round: currentRound,
        myBid: bidValue,
        avgBid: Math.round(avg),
        targetVal: Math.round(target),
        won,
      },
      ...prev,
    ]);

    // Decade Lockout Rule: Burn this 10-bracket forever!
    setBurnedDecades((prev) => [...prev, bidDecade]);

    if (currentRound < 3) {
      setCurrentRound((r) => r + 1);
      setTimeLeft(30);
      // Pick first non-burned decade default
      for (let d = 1; d <= 9; d++) {
        if (!burnedDecades.includes(d) && d !== bidDecade) {
          setBidValue(d * 10 + 5);
          break;
        }
      }
    } else {
      const coinsEarned = Math.round(Math.max(30, Math.min(160, (newTotal / 250) * 130)));
      setTimeout(() => {
        onComplete(coinsEarned, newTotal);
      }, 2500);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between p-6 bg-slate-950/90 border border-purple-500/30 rounded-3xl backdrop-blur-xl shadow-2xl text-white max-w-2xl mx-auto w-full">
      {/* Header Bar */}
      <div className="w-full flex items-center justify-between border-b border-purple-500/20 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400">
            <Trophy className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-wider text-purple-300 uppercase">
              The {targetPercentage}% Leverage Pool
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Round {currentRound} / 3 • Match target percentage of average bid
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
          <Clock className="w-4 h-4 text-purple-400" />
          <span className="font-mono text-sm font-bold text-purple-300">{timeLeft}s</span>
        </div>
      </div>

      {/* Target Metric Card */}
      <div className="w-full grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-xs font-bold text-slate-400 uppercase">Target Objective</span>
          <span className="text-3xl font-black text-purple-400 mt-1">{targetPercentage}% <span className="text-sm font-normal text-slate-400">of Average</span></span>
          <span className="text-[10px] text-slate-500 mt-1">Bluffing & game theory equilibrium</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-xs font-bold text-slate-400 uppercase">Earnings Accumulated</span>
          <span className="text-3xl font-black text-emerald-400 mt-1">{totalScore} <span className="text-sm font-normal text-slate-400">PTS</span></span>
          <span className="text-[10px] text-emerald-400/80 mt-1">Est. Payout: ~{Math.round((totalScore / 250) * 130)} Coins</span>
        </div>
      </div>

      {/* Number Slider with Decade Brackets */}
      <div className="w-full p-4 rounded-2xl bg-slate-900/60 border border-slate-800 mb-6 flex flex-col items-center">
        <span className="text-xs font-bold text-slate-400 uppercase mb-2">Secret Private Terminal Bid:</span>
        <span className={`text-4xl font-black font-mono my-2 ${isDecadeBurned ? "text-rose-400 line-through" : "text-white"}`}>
          {bidValue}
        </span>
        <input
          type="range"
          min={1}
          max={100}
          value={bidValue}
          onChange={(e) => setBidValue(Number(e.target.value))}
          className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
        />

        {/* Decade Lockout Indicator Bar */}
        <div className="w-full grid grid-cols-10 gap-1 mt-4">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((dec) => {
            const isBurned = burnedDecades.includes(dec);
            const isSelected = bidDecade === dec;
            return (
              <div
                key={dec}
                className={`py-1.5 rounded-lg text-center font-mono text-[10px] font-bold border transition-all ${
                  isBurned
                    ? "bg-rose-950/80 border-rose-500/50 text-rose-400 opacity-40 line-through"
                    : isSelected
                    ? "bg-purple-600 border-purple-400 text-white font-black scale-105"
                    : "bg-slate-950 border-slate-800 text-slate-400"
                }`}
              >
                {dec * 10}s
              </div>
            );
          })}
        </div>
        {isDecadeBurned && (
          <span className="text-[11px] text-rose-400 font-bold mt-2">
            ⚠️ Decade bracket {bidDecade * 10}-{bidDecade * 10 + 9} is burned! Choose a different range.
          </span>
        )}
      </div>

      {/* Submit Action */}
      <button
        onClick={handleSubmitBid}
        disabled={isDecadeBurned}
        className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 mb-4"
      >
        <span>Submit Secret Terminal Bid</span>
      </button>

      {/* Round History */}
      {roundHistory.length > 0 && (
        <div className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 flex flex-col gap-1.5">
          {roundHistory.map((h, idx) => (
            <div key={idx} className="flex items-center justify-between border-b border-slate-900 pb-1">
              <span>R{h.round}: You bid {h.myBid} • Avg: {h.avgBid} • Target: {h.targetVal}</span>
              <span className={h.won ? "text-emerald-400 font-bold" : "text-rose-400"}>
                {h.won ? "SAFE (+pts)" : "MISSED"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
