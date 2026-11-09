"use client";

import React, { useState } from "react";
import {
  Shield,
  Zap,
  Crosshair,
  Heart,
  Skull,
  Lock,
  Eye,
  Radio,
  Sparkles,
  AlertTriangle,
  Send,
  Target,
  Smile,
} from "lucide-react";
import { MastermindRole, MastermindPlayerInfo } from "../../../../party/types";

export interface RoleAbilitySpec {
  passive: { name: string; desc: string; icon: string };
  normal1: { name: string; desc: string; icon: string; requiresTarget: boolean; isLethal?: boolean };
  normal2: { name: string; desc: string; icon: string; requiresTarget: boolean; isLethal?: boolean };
  ultimate: { name: string; desc: string; icon: string; requiresTarget: boolean };
}

export const ROLE_ABILITIES: Record<MastermindRole, RoleAbilitySpec> = {
  sheriff: {
    passive: {
      name: "Ballistic Intel & Audit",
      desc: "Gains directional radar alerts on gunfire and terminal breaches.",
      icon: "🔍",
    },
    normal1: {
      name: "Investigation",
      desc: "Investigate target operative's secret alignment (Suspicious vs Innocent).",
      icon: "🔎",
      requiresTarget: true,
    },
    normal2: {
      name: "Service Pistol",
      desc: "Fires a regulated shot at target; inflicts 1 Wound.",
      icon: "🔫",
      requiresTarget: true,
      isLethal: true,
    },
    ultimate: {
      name: "Lockout Arrest",
      desc: "Completely freezes a player for 1 round (cannot buy, use abilities, or move coins).",
      icon: "⛓️",
      requiresTarget: true,
    },
  },
  killer: {
    passive: {
      name: "Shadow Step",
      desc: "Moves silently with zero footstep pings in dark or dynamic fog sectors.",
      icon: "👤",
    },
    normal1: {
      name: "Steal Half Points",
      desc: "Silently siphons 50% of target operative's coins.",
      icon: "💰",
      requiresTarget: true,
    },
    normal2: {
      name: "Covert Gun Strike",
      desc: "Fires an unregistered lethal bullet; leaves forensic trace.",
      icon: "🩸",
      requiresTarget: true,
      isLethal: true,
    },
    ultimate: {
      name: "Core Meltdown Deadlock",
      desc: "Seals all operatives in their current sectors and primes the central bomb rig.",
      icon: "💥",
      requiresTarget: false,
    },
  },
  doctor: {
    passive: {
      name: "Triage Awareness",
      desc: "Automatically detects the exact health state of all operatives at round start.",
      icon: "🩺",
    },
    normal1: {
      name: "First Aid",
      desc: "Applies a Bandage; prevents a Wounded player from deteriorating to Critical.",
      icon: "🩹",
      requiresTarget: true,
    },
    normal2: {
      name: "Antidote / Medicine",
      desc: "Restores 1 Wound or cures slow neurotoxin status.",
      icon: "💊",
      requiresTarget: true,
    },
    ultimate: {
      name: "Defibrillate / Revive",
      desc: "Resurrects a fallen or critical operative back to life.",
      icon: "✨",
      requiresTarget: true,
    },
  },
  thief: {
    passive: {
      name: "Master Craftsman",
      desc: "Decreased crafting costs and access to hidden ventilation shortcuts.",
      icon: "🛠️",
    },
    normal1: {
      name: "Steal Full Points",
      desc: "Empties unprotected target wallet into your private stash.",
      icon: "💎",
      requiresTarget: true,
    },
    normal2: {
      name: "Pocket Raid",
      desc: "Steals a random minor crafting component from target operative.",
      icon: "🧤",
      requiresTarget: true,
    },
    ultimate: {
      name: "Master Vault Breach",
      desc: "Disables security alarms and cracks 2 Vault gates simultaneously.",
      icon: "🔓",
      requiresTarget: false,
    },
  },
  soldier: {
    passive: {
      name: "Reinforced Plating",
      desc: "Absorbs the first Wound in each combat encounter; immune to stagger.",
      icon: "🛡️",
    },
    normal1: {
      name: "Deploy Heavy Shield",
      desc: "Projects nanite shield over self or target ally to block all incoming hits.",
      icon: "🔰",
      requiresTarget: true,
    },
    normal2: {
      name: "Fortify Barricade",
      desc: "Deploys heavy welds to reinforce shelter sectors against hostile entry.",
      icon: "🧱",
      requiresTarget: true,
    },
    ultimate: {
      name: "Central Dome Lockdown",
      desc: "Seals the central dome vault, protecting all survivors sheltered inside.",
      icon: "🏛️",
      requiresTarget: false,
    },
  },
  joker: {
    passive: {
      name: "Trickster Deception",
      desc: "Immune to forensic audit; investigations yield inverted alignment.",
      icon: "🃏",
    },
    normal1: {
      name: "Swap Places",
      desc: "Swaps physical table position and incoming status effects with target.",
      icon: "🔄",
      requiresTarget: true,
    },
    normal2: {
      name: "Steal Card",
      desc: "Swaps or confiscates a random ability/item card from target.",
      icon: "🎴",
      requiresTarget: true,
    },
    ultimate: {
      name: "Grand Swindle",
      desc: "If attacked by Town operatives tonight, you survive and claim the Town prize pool.",
      icon: "👑",
      requiresTarget: false,
    },
  },
  wizard: {
    passive: {
      name: "Arcane Sight",
      desc: "Instantly senses which operatives hold Tier 2 and Tier 3 game-ending parts.",
      icon: "🔮",
    },
    normal1: {
      name: "Kill / Revive",
      desc: "Smite an enemy operative or restore a fallen player.",
      icon: "⚡",
      requiresTarget: true,
    },
    normal2: {
      name: "Random Ability Surge",
      desc: "Channels a random active power from any class for this round.",
      icon: "🎲",
      requiresTarget: false,
    },
    ultimate: {
      name: "Chrono Reset",
      desc: "Rewinds lethal damage dealt across all sectors during the round.",
      icon: "⏳",
      requiresTarget: false,
    },
  },
  hacker: {
    passive: {
      name: "Digital Wiretap",
      desc: "Monitors electronic auction bids and security camera telemetry.",
      icon: "💻",
    },
    normal1: {
      name: "Intercept Ability",
      desc: "Nullifies target operative's queued action for this round.",
      icon: "🚫",
      requiresTarget: true,
    },
    normal2: {
      name: "Disrupt Power Grid",
      desc: "Scrambles security cameras and locks doors in 2 sectors.",
      icon: "⚡",
      requiresTarget: true,
    },
    ultimate: {
      name: "Facility Blackout",
      desc: "Cuts power shelter-wide; disables all shields, cameras, and terminals.",
      icon: "🌑",
      requiresTarget: false,
    },
  },
};

interface RoundTableMeetingProps {
  players: MastermindPlayerInfo[];
  myPlayer: MastermindPlayerInfo;
  timer: number;
  onUseAbility: (abilityType: string, targetId?: string) => void;
  onTableAction?: (action: 'point' | 'laser' | 'emote', targetId?: string) => void;
}

export const RoundTableMeeting: React.FC<RoundTableMeetingProps> = ({
  players,
  myPlayer,
  timer,
  onUseAbility,
  onTableAction,
}) => {
  const [selectedAbility, setSelectedAbility] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [pointedTargetId, setPointedTargetId] = useState<string | null>(null);
  const [activeEmotes, setActiveEmotes] = useState<Record<string, string>>({});
  const [isLockedIn, setIsLockedIn] = useState(false);
  const [throwAnim, setThrowAnim] = useState<{ from: string; to: string; emoji: string } | null>(null);

  const abilities = ROLE_ABILITIES[myPlayer.role] || ROLE_ABILITIES.sheriff;

  const handleTriggerEmote = (emote: string) => {
    setActiveEmotes((prev) => ({ ...prev, [myPlayer.id]: emote }));
    if (onTableAction) {
      onTableAction("emote", selectedTargetId || undefined);
    }
    setTimeout(() => {
      setActiveEmotes((prev) => {
        const next = { ...prev };
        delete next[myPlayer.id];
        return next;
      });
    }, 2500);
  };

  const handlePointAt = (targetId: string) => {
    setPointedTargetId(targetId);
    if (onTableAction) {
      onTableAction("point", targetId);
    }
    setTimeout(() => setPointedTargetId(null), 2000);
  };

  const handleConfirmAbility = () => {
    if (!selectedAbility) return;
    onUseAbility(selectedAbility, selectedTargetId || undefined);
    setIsLockedIn(true);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl border border-cyan-500/30 shadow-2xl overflow-hidden select-none">
      {/* Flyover animation style */}
      <style>{`
        @keyframes flyIn {
          0% { transform: scale(0.5) translateY(10px); opacity: 0; }
          40% { transform: scale(1.3) translateY(-8px); opacity: 1; }
          100% { transform: scale(1) translateY(0px); opacity: 0.9; }
        }
        .throw-fly { animation: flyIn 1.2s ease forwards; }
      `}</style>

      {/* Background Holographic Grid Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/20 via-transparent to-transparent pointer-events-none" />

      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between border-b border-cyan-500/20 pb-3 z-10">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Phase 2: Round Table Assembly</span>
          </div>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Secret Council Chamber • Anonymous Operative Order
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-xs font-bold text-slate-400">Time:</span>
          <span className="font-mono text-sm font-black text-amber-400">{timer}s</span>
        </div>
      </div>

      {/* Center 3D / Isometric Round Table Visualizer */}
      <div className="relative w-full max-w-xl aspect-[16/10] my-4 flex items-center justify-center">
        {/* The Round Table Surface — Enhanced Cyberpunk */}
        <div
          className="relative w-80 sm:w-[400px] h-52 sm:h-64 rounded-[100%] border-4 flex items-center justify-center"
          style={{
            background: 'radial-gradient(ellipse at 30% 30%, #1e3a5f 0%, #0f172a 60%, #060913 100%)',
            borderColor: '#38bdf8',
            boxShadow: '0 0 60px #0ea5e955, 0 0 20px #0ea5e933, inset 0 0 40px #0ea5e911',
          }}
        >
          {/* Table Center Hologram */}
          <div className="w-24 h-24 rounded-full border border-cyan-400/30 bg-cyan-500/10 flex flex-col items-center justify-center text-center p-2">
            <Radio className="w-5 h-5 text-cyan-300 animate-pulse mb-1" />
            <span className="text-[9px] font-black tracking-wider text-cyan-300 uppercase">
              COUNCIL HUB
            </span>
          </div>

          {/* Seated Anonymous Operatives around the Table */}
          {players.map((p, idx) => {
            const angle = (idx / players.length) * 2 * Math.PI;
            const radiusX = 140; // ellipse radius X
            const radiusY = 90; // ellipse radius Y
            const x = Math.cos(angle) * radiusX;
            const y = Math.sin(angle) * radiusY;

            const isMe = p.id === myPlayer.id;
            const isSelected = selectedTargetId === p.id;
            const isPointed = pointedTargetId === p.id;
            const emote = activeEmotes[p.id];
            const isThrowTarget = throwAnim && throwAnim.to === p.id;

            return (
              <div
                key={p.id}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  ...(p.health === 'dead' ? { filter: 'grayscale(1)', opacity: 0.4 } : {}),
                }}
                onClick={() => {
                  if (!isMe && p.health !== "dead") {
                    setSelectedTargetId(p.id);
                  }
                }}
                className={`absolute flex flex-col items-center cursor-pointer transition-all duration-200 z-20 ${
                  isMe ? "scale-110" : "hover:scale-105"
                }`}
              >
                {/* Floating Reaction Emote */}
                {emote && (
                  <div className="absolute -top-7 px-2 py-0.5 rounded-full bg-slate-900 border border-amber-400 text-lg shadow-lg animate-bounce z-30">
                    {emote}
                  </div>
                )}

                {/* Throw animation overlay */}
                {isThrowTarget && throwAnim && (
                  <div className="absolute -top-10 text-2xl z-40 throw-fly pointer-events-none">
                    {throwAnim.emoji}
                  </div>
                )}

                {/* Laser Pointer / Target Indicator */}
                {isPointed && (
                  <div className="absolute -top-8 px-2 py-0.5 rounded-lg bg-rose-950 border border-rose-500 text-rose-300 text-[10px] font-black uppercase animate-pulse">
                    🎯 POINTED!
                  </div>
                )}

                {/* Operative Avatar Token */}
                <div
                  className={`relative w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold border-2 transition-all shadow-lg ${
                    isSelected
                      ? "ring-4 ring-cyan-400 scale-110 border-white shadow-cyan-400/50"
                      : isMe
                      ? "border-cyan-400 shadow-cyan-900/60"
                      : "border-slate-700 bg-slate-900 shadow-black"
                  }`}
                  style={{ backgroundColor: p.color + "33" }}
                >
                  <span>{p.avatar}</span>
                  {p.health === "wounded" && (
                    <span className="absolute -top-1 -right-1 text-xs">🩸</span>
                  )}
                  {p.health === "dead" && (
                    <span className="absolute inset-0 bg-black/80 rounded-2xl flex items-center justify-center text-rose-500 font-bold">
                      ✕
                    </span>
                  )}
                </div>

                {/* Anonymous Label */}
                <span className="text-[10px] font-black text-slate-300 mt-1 max-w-[80px] truncate">
                  {p.name} {isMe ? "(You)" : ""}
                </span>
                <span className="text-[9px] text-slate-500 font-mono capitalize">
                  {p.health}
                </span>

                {/* Playful Gesture Buttons */}
                {!isMe && (
                  <div className="flex items-center gap-1 mt-1 opacity-0 hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePointAt(p.id);
                      }}
                      className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[9px]"
                      title="Point laser at operative"
                    >
                      👉
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerEmote("👀");
                      }}
                      className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300 text-[9px]"
                      title="Stare suspiciously"
                    >
                      👀
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setThrowAnim({ from: myPlayer.id, to: p.id, emoji: ['🍅', '💣', '🎃', '🧨', '🪃'][Math.floor(Math.random() * 5)] });
                        setTimeout(() => setThrowAnim(null), 1200);
                      }}
                      className="p-1 rounded-md bg-orange-900/60 hover:bg-orange-800 text-sm"
                      title="Throw item"
                    >
                      🪃
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Role Card & Action Control Deck */}
      <div className="w-full max-w-3xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col gap-3 z-10 backdrop-blur-md">
        {/* Role Bar & Passive Trait */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Assigned Secret Role:</span>
            <span className="text-sm font-black text-cyan-300 uppercase tracking-wider">
              {myPlayer.role}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-950/60 border border-purple-500/40 text-[10px] text-purple-300 font-bold">
            <span>{abilities.passive.icon}</span>
            <span>Passive: {abilities.passive.name}</span>
          </div>
        </div>

        {/* 3 Active Abilities: Normal 1, Normal 2, Ultimate */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Normal 1 */}
          <button
            onClick={() => setSelectedAbility("normal1")}
            disabled={isLockedIn}
            className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
              selectedAbility === "normal1"
                ? "bg-cyan-950/80 border-cyan-400 text-white shadow-lg shadow-cyan-950/80 scale-[1.02]"
                : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-base">{abilities.normal1.icon}</span>
              <span className="text-[10px] font-black uppercase text-cyan-400">Normal I</span>
            </div>
            <span className="text-xs font-bold text-white truncate">{abilities.normal1.name}</span>
            <span className="text-[10px] text-slate-400 line-clamp-2 mt-1">
              {abilities.normal1.desc}
            </span>
          </button>

          {/* Normal 2 */}
          <button
            onClick={() => setSelectedAbility("normal2")}
            disabled={isLockedIn}
            className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
              selectedAbility === "normal2"
                ? "bg-cyan-950/80 border-cyan-400 text-white shadow-lg shadow-cyan-950/80 scale-[1.02]"
                : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-base">{abilities.normal2.icon}</span>
              <span className="text-[10px] font-black uppercase text-cyan-400">Normal II</span>
            </div>
            <span className="text-xs font-bold text-white truncate">{abilities.normal2.name}</span>
            <span className="text-[10px] text-slate-400 line-clamp-2 mt-1">
              {abilities.normal2.desc}
            </span>
          </button>

          {/* Ultimate */}
          <button
            onClick={() => setSelectedAbility("ultimate")}
            disabled={isLockedIn}
            className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
              selectedAbility === "ultimate"
                ? "bg-amber-950/80 border-amber-400 text-white shadow-lg shadow-amber-950/80 scale-[1.02]"
                : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-base">{abilities.ultimate.icon}</span>
              <span className="text-[10px] font-black uppercase text-amber-400">Ultimate</span>
            </div>
            <span className="text-xs font-bold text-white truncate">{abilities.ultimate.name}</span>
            <span className="text-[10px] text-slate-400 line-clamp-2 mt-1">
              {abilities.ultimate.desc}
            </span>
          </button>
        </div>

        {/* Lock-In Action & Target Confirmation */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="text-xs font-mono text-slate-300">
            {selectedTargetId ? (
              <span>
                Target: <span className="text-cyan-400 font-bold">{players.find((p) => p.id === selectedTargetId)?.name}</span>
              </span>
            ) : (
              <span className="text-slate-500">Click an operative around the table to target</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Playful Reaction Buttons */}
            <div className="flex items-center gap-1 mr-2">
              {["🎯", "👀", "🤫", "🍿", "😂", "🤔", "😤", "🫵"].map((em) => (
                <button
                  key={em}
                  onClick={() => handleTriggerEmote(em)}
                  className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm transition-transform active:scale-90"
                >
                  {em}
                </button>
              ))}
            </div>

            <button
              onClick={handleConfirmAbility}
              disabled={isLockedIn || !selectedAbility}
              className="py-2.5 px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-600/30 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>{isLockedIn ? "Action Locked" : "Confirm Ability"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
