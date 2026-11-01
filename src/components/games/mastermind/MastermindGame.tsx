"use client";

import React, { useState, useEffect } from "react";
import {
  RoomState,
  MastermindGameState,
  MastermindRole,
  MastermindItem,
} from "../../../../party/types";
import {
  Clock,
  Shield,
  Heart,
  Skull,
  Coins,
  Crosshair,
  UserCheck,
  Zap,
  ShoppingBag,
  Newspaper,
  Vote,
  Trophy,
  FastForward,
  HelpCircle,
  Eye,
  Lock,
  Sparkles,
} from "lucide-react";

interface MastermindGameProps {
  roomState: RoomState;
  myId: string;
  onSubmitMinigameScore: (score: number) => void;
  onBuyItem: (item: MastermindItem) => void;
  onUseAbility: (abilityType: string, targetId?: string) => void;
  onVoteSuspect: (suspectId: string) => void;
  onReturnToLobby: () => void;
  onSkipTimer?: () => void;
}

const ROLE_INFO: Record<
  MastermindRole,
  { name: string; emoji: string; team: string; teamColor: string; desc: string; r1Power: string; r2Power: string }
> = {
  killer: {
    name: "Killer",
    emoji: "🔪",
    team: "Syndicate",
    teamColor: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    desc: "Eliminate the Town members. Coordinate secretly or strike from the shadows.",
    r1Power: "Steal 30% of a target's cash.",
    r2Power: "Shoot to wound or execute any target.",
  },
  thief: {
    name: "Thief",
    emoji: "🦹",
    team: "Syndicate",
    teamColor: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    desc: "Syndicate operative specializing in financial sabotage and heist.",
    r1Power: "Steal 40% of someone's cash.",
    r2Power: "Full Robbery — steal 100% of a target's cash.",
  },
  sheriff: {
    name: "Sheriff",
    emoji: "🤠",
    team: "Town",
    teamColor: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    desc: "The law enforcement leader. Unmask Syndicate members or execute suspects.",
    r1Power: "Investigate a suspect to learn if they are Innocent or Suspicious.",
    r2Power: "Acquires a service weapon — can shoot anyone suspected of betrayal.",
  },
  soldier: {
    name: "Soldier",
    emoji: "🛡️",
    team: "Town",
    teamColor: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    desc: "Combat defense specialist who can shield vulnerable allies.",
    r1Power: "Gain 1 Shield — deploy on yourself or any ally to block a bullet.",
    r2Power: "Gain an additional Shield per round.",
  },
  doctor: {
    name: "Doctor",
    emoji: "💉",
    team: "Town",
    teamColor: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    desc: "Medical lifeline for the team. Heal the wounded and resurrect the fallen.",
    r1Power: "Gain 1 Medpack — stabilize a wounded player for 1 round.",
    r2Power: "Use 2 Medpacks to permanently revive a dead player and inspect their belongings.",
  },
  joker: {
    name: "Joker",
    emoji: "🃏",
    team: "Neutral",
    teamColor: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    desc: "The chaotic wildcard. Swap places with someone — if shot by town you triumph!",
    r1Power: "Observation & stealth.",
    r2Power: "Swap target during ability phase — deflects or redirects attacks.",
  },
  wizard: {
    name: "Wizard",
    emoji: "🧙",
    team: "Neutral",
    teamColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    desc: "Ancient power broker with the power of ultimate life or instant doom.",
    r1Power: "Accumulate mana.",
    r2Power: "Resurrect any player from death OR strike down any target with 2 lethal wounds.",
  },
  hacker: {
    name: "Hacker",
    emoji: "💻",
    team: "Syndicate",
    teamColor: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    desc: "Cyber specialist who disables a rival's ability in the dark.",
    r1Power: "Snoop on player cash balances.",
    r2Power: "Intercept and nullify one player's night ability.",
  },
  hitman: {
    name: "Hitman",
    emoji: "🎯",
    team: "Syndicate",
    teamColor: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    desc: "Lethal mercenary contracted by the Syndicate to eliminate priority targets.",
    r1Power: "Scope out targets.",
    r2Power: "Execute a lethal contract strike.",
  },
  judge: {
    name: "Judge",
    emoji: "⚖️",
    team: "Town",
    teamColor: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    desc: "Presiding authority. Can lock a suspect in jail, disabling all their powers for the night.",
    r1Power: "Hold court deliberation.",
    r2Power: "Jail one player for the night, disabling their ability.",
  },
};

const SHOP_ITEMS: Array<{
  id: MastermindItem;
  name: string;
  cost: number;
  icon: string;
  desc: string;
}> = [
  { id: "vest", name: "Bulletproof Vest", cost: 50, icon: "🦺", desc: "Absorbs 1 bullet hit automatically." },
  { id: "wiretap", name: "Audio Wiretap", cost: 80, icon: "📡", desc: "Reveals another player's cash balance." },
  { id: "smoke", name: "Smoke Grenade", cost: 40, icon: "💨", desc: "Protects you from being robbed tonight." },
  { id: "adrenaline", name: "Adrenaline Shot", cost: 60, icon: "⚡", desc: "Gives bonus score in the next mini-game." },
  { id: "ammo", name: "Extra Ammo", cost: 70, icon: "💥", desc: "Increases ability effectiveness." },
];

export const MastermindGame: React.FC<MastermindGameProps> = ({
  roomState,
  myId,
  onSubmitMinigameScore,
  onBuyItem,
  onUseAbility,
  onVoteSuspect,
  onReturnToLobby,
  onSkipTimer,
}) => {
  const g = roomState.mastermindState;
  const isHost = roomState.hostId === myId;
  const me = g?.players[myId];

  // Minigame internal state
  const [minigameScore, setMinigameScore] = useState(0);
  const [minigameTarget, setMinigameTarget] = useState<{ x: number; y: number; val: number } | null>(null);
  const [cardRevealed, setCardRevealed] = useState(false);

  // Ability selection state
  const [selectedAbility, setSelectedAbility] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [abilityConfirmed, setAbilityConfirmed] = useState(false);

  // Vote state
  const [votedSuspectId, setVotedSuspectId] = useState<string | null>(null);

  // Reset ability selection on phase transition
  useEffect(() => {
    if (g?.phase === "night_ability") {
      setSelectedAbility(null);
      setSelectedTargetId(null);
      setAbilityConfirmed(false);
    }
    if (g?.phase === "deliberation_vote") {
      setVotedSuspectId(null);
    }
  }, [g?.phase]);

  // Mini-game target spawner
  useEffect(() => {
    if (g?.phase !== "minigame" || me?.health === "dead") return;

    const spawnTarget = () => {
      const rx = Math.floor(10 + Math.random() * 80);
      const ry = Math.floor(15 + Math.random() * 70);
      const val = Math.floor(10 + Math.random() * 20);
      setMinigameTarget({ x: rx, y: ry, val });
    };

    spawnTarget();
    const interval = setInterval(spawnTarget, 1100);
    return () => clearInterval(interval);
  }, [g?.phase, me?.health]);

  if (!g) return null;

  const handleTargetClick = (val: number) => {
    const next = minigameScore + val;
    setMinigameScore(next);
    onSubmitMinigameScore(next);
    setMinigameTarget(null);
  };

  const roleMeta = me ? ROLE_INFO[me.role] : null;
  const livingPlayers = Object.values(g.players).filter((p) => p.health !== "dead");
  const otherLivingPlayers = livingPlayers.filter((p) => p.id !== myId);

  const handleConfirmAbility = () => {
    if (!selectedAbility) return;
    onUseAbility(selectedAbility, selectedTargetId ?? undefined);
    setAbilityConfirmed(true);
  };

  const handleCastVote = (suspectId: string) => {
    setVotedSuspectId(suspectId);
    onVoteSuspect(suspectId);
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-gradient-to-b from-[#090b14] via-[#0d1124] to-[#05070e] text-white p-3 md:p-6 overflow-y-auto select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold">
            Round {g.currentRound} / {g.totalRounds}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>🔫 Mastermind Protocol</span>
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold uppercase">
              {g.phase.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <Clock className={`w-4 h-4 ${g.timer <= 5 ? "text-rose-400 animate-ping" : "text-amber-400"}`} />
            <span className={`text-base font-mono font-black ${g.timer <= 5 ? "text-rose-400" : "text-white"}`}>
              {g.timer}s
            </span>
          </div>

          {isHost && (
            <button
              onClick={onSkipTimer}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-all"
              title="Skip phase timer"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4">
        {/* Left Column: Player Identity & Roster */}
        <div className="w-full lg:w-80 flex flex-col gap-3">
          {/* Identity Card */}
          {me && roleMeta && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Secret Role</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${roleMeta.teamColor}`}>
                  {roleMeta.team}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-4xl p-2 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
                  {roleMeta.emoji}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{roleMeta.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {me.health === "healthy" && (
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-emerald-400" /> Healthy
                      </span>
                    )}
                    {me.health === "wounded" && (
                      <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 animate-pulse">
                        <Heart className="w-3 h-3 fill-amber-400" /> Wounded (Critical)
                      </span>
                    )}
                    {me.health === "dead" && (
                      <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                        <Skull className="w-3 h-3" /> Deceased
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                {roleMeta.desc}
              </p>

              {/* Status & Stats */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Cash</span>
                  <span className="font-mono font-bold text-amber-300">${me.cash}</span>
                </div>
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Medpacks</span>
                  <span className="font-mono font-bold text-emerald-300">💉 {me.medpacks}</span>
                </div>
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Shields</span>
                  <span className="font-mono font-bold text-blue-300">🛡️ {me.shields}</span>
                </div>
              </div>

              {/* Inventory */}
              {me.inventory.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-bold">Items:</span>
                  {me.inventory.map((item, idx) => {
                    const shopItem = SHOP_ITEMS.find((s) => s.id === item);
                    return (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold"
                        title={shopItem?.name}
                      >
                        {shopItem?.icon} {shopItem?.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Roster / Status List */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex-1 flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Players ({Object.keys(g.players).length})</span>
            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-56">
              {Object.values(g.players).map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2 rounded-xl border text-xs ${
                    p.id === myId
                      ? "bg-purple-950/30 border-purple-500/40"
                      : "bg-slate-950 border-slate-800/80"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white truncate max-w-[110px]">
                      {p.name} {p.id === myId ? "(You)" : ""}
                    </span>
                    {g.mvpPlayerId === p.id && (
                      <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5">
                        <Trophy className="w-3 h-3" /> MVP
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400">${p.cash}</span>
                    {p.health === "healthy" && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Healthy" />}
                    {p.health === "wounded" && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" title="Wounded" />}
                    {p.health === "dead" && <span className="w-2.5 h-2.5 rounded-full bg-rose-600" title="Dead" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center / Phase Stage */}
        <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          {/* Phase 1: Role Reveal */}
          {g.phase === "role_reveal" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-4">
              <span className="text-xs font-black tracking-widest uppercase text-purple-400">Card Assignment</span>
              <div
                onClick={() => setCardRevealed(!cardRevealed)}
                className={`w-52 h-72 rounded-3xl border-2 flex flex-col items-center justify-center p-4 cursor-pointer transition-all duration-500 transform hover:scale-105 shadow-2xl ${
                  cardRevealed
                    ? "bg-gradient-to-b from-slate-900 to-purple-950 border-purple-500"
                    : "bg-gradient-to-b from-indigo-950 to-slate-950 border-indigo-500/40"
                }`}
              >
                {!cardRevealed ? (
                  <div className="flex flex-col items-center gap-3">
                    <Sparkles className="w-12 h-12 text-indigo-400 animate-pulse" />
                    <span className="font-black text-sm text-indigo-200">Tap to Reveal Your Role</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 animate-fade-in">
                    <span className="text-5xl">{roleMeta?.emoji}</span>
                    <h2 className="text-xl font-black text-white">{roleMeta?.name}</h2>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${roleMeta?.teamColor}`}>
                      {roleMeta?.team}
                    </span>
                    <p className="text-[11px] text-slate-300 mt-2 leading-relaxed text-center">
                      {roleMeta?.desc}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 max-w-md">
                Keep your role strictly secret. Prepare for the financial mini-game to earn tactical capital!
              </p>
            </div>
          )}

          {/* Phase 2: Mini-game (Reflex Arena) */}
          {g.phase === "minigame" && (
            <div className="flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" /> Reflex Decryption Grid
                  </h3>
                  <span className="text-xs text-slate-400">Tap appearing nodes rapidly to harvest cash rewards!</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Your Score</span>
                  <span className="text-xl font-mono font-black text-amber-400">{minigameScore}</span>
                </div>
              </div>

              {/* Arena Grid */}
              <div className="relative flex-1 bg-slate-950 rounded-2xl border border-slate-800/80 my-3 overflow-hidden flex items-center justify-center">
                {minigameTarget && me?.health !== "dead" && (
                  <button
                    type="button"
                    onClick={() => handleTargetClick(minigameTarget.val)}
                    style={{ left: `${minigameTarget.x}%`, top: `${minigameTarget.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-lg shadow-amber-500/40 animate-bounce active:scale-90 transition-transform"
                  >
                    +{minigameTarget.val}
                  </button>
                )}
                {me?.health === "dead" && (
                  <div className="text-center text-slate-500 text-xs">
                    <Skull className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <span>Eliminated players cannot participate in the mini-game.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phase 3: Dark Market / Shop */}
          {g.phase === "shop" && (
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-purple-400" /> Black Market Supply
                  </h3>
                  <span className="text-xs text-slate-400">Equip tactical gear with your earned funds.</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Available Cash</span>
                  <span className="text-lg font-mono font-black text-emerald-400">${me?.cash || 0}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto">
                {SHOP_ITEMS.map((item) => {
                  const canAfford = (me?.cash || 0) >= item.cost;
                  const hasMaxItems = (me?.inventory.length || 0) >= 3;
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <div className="font-bold text-xs text-white">{item.name}</div>
                          <div className="text-[10px] text-slate-400 leading-tight">{item.desc}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onBuyItem(item.id)}
                        disabled={!canAfford || hasMaxItems || me?.health === "dead"}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white font-mono font-bold text-xs transition-all flex items-center gap-1 flex-shrink-0"
                      >
                        <Coins className="w-3 h-3" />
                        <span>${item.cost}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Phase 4: Night Ability */}
          {g.phase === "night_ability" && (
            <div className="flex-1 flex flex-col justify-between gap-3">
              <div className="border-b border-slate-800 pb-2">
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-rose-400" /> Covert Operation Window (15s)
                </h3>
                <span className="text-xs text-slate-400">Select and deploy your role's power under cover of night.</span>
              </div>

              {me?.health === "dead" ? (
                <div className="text-center text-slate-500 py-10">
                  <Skull className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <span className="text-xs font-bold">You are eliminated. Observe the remaining players.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3 my-auto">
                  {/* Role Specific Actions */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {/* Killer */}
                    {me?.role === "killer" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedAbility("steal_cash")}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                            selectedAbility === "steal_cash" ? "bg-rose-600 text-white border-rose-400" : "bg-slate-950 border-slate-800 text-slate-300"
                          }`}
                        >
                          💰 Steal Cash (30%)
                        </button>
                        {g.currentRound >= 2 && (
                          <button
                            type="button"
                            onClick={() => setSelectedAbility("shoot")}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                              selectedAbility === "shoot" ? "bg-rose-600 text-white border-rose-400" : "bg-slate-950 border-slate-800 text-slate-300"
                            }`}
                          >
                            🔫 Shoot / Execute
                          </button>
                        )}
                      </>
                    )}

                    {/* Thief */}
                    {me?.role === "thief" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedAbility("steal_cash")}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                            selectedAbility === "steal_cash" ? "bg-rose-600 text-white border-rose-400" : "bg-slate-950 border-slate-800 text-slate-300"
                          }`}
                        >
                          💰 Pickpocket (40%)
                        </button>
                        {g.currentRound >= 2 && (
                          <button
                            type="button"
                            onClick={() => setSelectedAbility("rob")}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                              selectedAbility === "rob" ? "bg-rose-600 text-white border-rose-400" : "bg-slate-950 border-slate-800 text-slate-300"
                            }`}
                          >
                            🏦 Full Heist (100% Rob)
                          </button>
                        )}
                      </>
                    )}

                    {/* Sheriff */}
                    {me?.role === "sheriff" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedAbility("investigate")}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                            selectedAbility === "investigate" ? "bg-blue-600 text-white border-blue-400" : "bg-slate-950 border-slate-800 text-slate-300"
                          }`}
                        >
                          🔍 Interrogate / Investigate
                        </button>
                        {g.currentRound >= 2 && (
                          <button
                            type="button"
                            onClick={() => setSelectedAbility("shoot")}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                              selectedAbility === "shoot" ? "bg-blue-600 text-white border-blue-400" : "bg-slate-950 border-slate-800 text-slate-300"
                            }`}
                          >
                            🔫 Service Weapon (Shoot)
                          </button>
                        )}
                      </>
                    )}

                    {/* Soldier */}
                    {me?.role === "soldier" && (
                      <button
                        type="button"
                        onClick={() => setSelectedAbility("shield")}
                        disabled={me.shields <= 0}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 ${
                          selectedAbility === "shield" ? "bg-blue-600 text-white border-blue-400" : "bg-slate-950 border-slate-800 text-slate-300"
                        }`}
                      >
                        🛡️ Deploy Shield ({me.shields} left)
                      </button>
                    )}

                    {/* Doctor */}
                    {me?.role === "doctor" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedAbility("heal_one")}
                          disabled={me.medpacks < 1}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 ${
                            selectedAbility === "heal_one" ? "bg-emerald-600 text-white border-emerald-400" : "bg-slate-950 border-slate-800 text-slate-300"
                          }`}
                        >
                          💉 Stabilize Wounded (1 Medpack)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedAbility("revive")}
                          disabled={me.medpacks < 2}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 ${
                            selectedAbility === "revive" ? "bg-emerald-600 text-white border-emerald-400" : "bg-slate-950 border-slate-800 text-slate-300"
                          }`}
                        >
                          ✨ Full Revive (2 Medpacks)
                        </button>
                      </>
                    )}

                    {/* Joker */}
                    {me?.role === "joker" && (
                      <button
                        type="button"
                        onClick={() => setSelectedAbility("swap")}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                          selectedAbility === "swap" ? "bg-purple-600 text-white border-purple-400" : "bg-slate-950 border-slate-800 text-slate-300"
                        }`}
                      >
                        🃏 Swap Places
                      </button>
                    )}
                  </div>

                  {/* Target Selector */}
                  {selectedAbility && (
                    <div className="flex flex-col items-center gap-2 mt-2">
                      <span className="text-xs text-slate-400 font-semibold">Select Target:</span>
                      <div className="flex items-center gap-2 flex-wrap justify-center">
                        {(selectedAbility === "shield" ? livingPlayers : otherLivingPlayers).map((target) => (
                          <button
                            key={target.id}
                            type="button"
                            onClick={() => setSelectedTargetId(target.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                              selectedTargetId === target.id
                                ? "bg-purple-600 text-white border-purple-400 scale-105"
                                : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                            }`}
                          >
                            {target.name} {target.id === myId ? "(You)" : ""}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmAbility}
                        disabled={!selectedTargetId || abilityConfirmed}
                        className="mt-3 px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all"
                      >
                        {abilityConfirmed ? "✅ Action Locked In" : "Confirm Night Action"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Phase 5: Morning News */}
          {g.phase === "morning_news" && (
            <div className="flex-1 flex flex-col gap-3">
              <div className="border-b border-slate-800 pb-2">
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Newspaper className="w-4 h-4 text-amber-400" /> Morning Daily Gazette
                </h3>
                <span className="text-xs text-slate-400">Overnight reports and intelligence findings.</span>
              </div>

              <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-72 p-2 bg-slate-950 rounded-xl border border-slate-800">
                {g.nightNews.length === 0 ? (
                  <div className="text-center text-slate-500 my-auto text-xs">
                    The night was quiet. No overt incidents reported.
                  </div>
                ) : (
                  g.nightNews.map((news, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 leading-relaxed animate-fade-in"
                    >
                      {news}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Phase 6: Deliberation & Vote */}
          {g.phase === "deliberation_vote" && (
            <div className="flex-1 flex flex-col justify-between gap-3">
              <div className="border-b border-slate-800 pb-2">
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Vote className="w-4 h-4 text-purple-400" /> Tribunal Deliberation & Accusation
                </h3>
                <span className="text-xs text-slate-400">Debate and cast your vote on who should be eliminated.</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-auto">
                {otherLivingPlayers.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => handleCastVote(player.id)}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                      votedSuspectId === player.id
                        ? "bg-rose-950/40 border-rose-500 scale-105 shadow-lg shadow-rose-950/50"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-sm font-bold text-white">{player.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">${player.cash}</span>
                    {votedSuspectId === player.id && (
                      <span className="text-[10px] font-bold text-rose-400 mt-1">VOTED</span>
                    )}
                  </button>
                ))}

                {/* Safe Skip Vote */}
                <button
                  type="button"
                  onClick={() => handleCastVote("skip")}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                    votedSuspectId === "skip"
                      ? "bg-slate-800 border-slate-600 scale-105"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <span className="text-sm font-bold">Skip / Abstain</span>
                </button>
              </div>
            </div>
          )}

          {/* Phase 7: Game Over */}
          {g.phase === "game_over" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-4">
              <Trophy className="w-16 h-16 text-amber-400 animate-bounce" />
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Operation Concluded
                </span>
                <h2 className="text-3xl font-black text-white capitalize">
                  {g.winner} Victory!
                </h2>
              </div>

              {g.mvpPlayerId && g.players[g.mvpPlayerId] && (
                <div className="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                  👑 Most Valuable Player: {g.players[g.mvpPlayerId].name} (${g.players[g.mvpPlayerId].mvpPoints} pts)
                </div>
              )}

              {/* Reveal All Roles */}
              <div className="w-full max-w-md bg-slate-950 p-3 rounded-2xl border border-slate-800 text-left my-2">
                <span className="text-[10px] font-bold uppercase text-slate-500 block mb-2">Unmasked Roster:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.values(g.players).map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5 p-1.5 bg-slate-900 rounded-lg">
                      <span>{ROLE_INFO[p.role]?.emoji}</span>
                      <span className="font-bold text-white truncate">{p.name}</span>
                      <span className="text-[10px] text-slate-400 capitalize">({p.role})</span>
                    </div>
                  ))}
                </div>
              </div>

              {isHost && (
                <button
                  type="button"
                  onClick={onReturnToLobby}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-xl shadow-purple-600/30 transition-all hover:scale-105"
                >
                  Return to Lobby
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
