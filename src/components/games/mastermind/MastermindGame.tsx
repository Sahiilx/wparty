"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  RoomState,
  MastermindGameState,
  MastermindItem,
  MastermindRole,
} from "../../../../party/types";
import {
  Trophy,
  Skull,
  Crown,
  Heart,
  Clock,
  FastForward,
  Bot,
  RotateCcw,
  Users,
  Compass,
  Sparkles,
  ShoppingCart,
  Zap,
  Target,
  Shield,
  Check,
  AlertTriangle,
  HelpCircle,
  X,
  Maximize2,
  ChevronRight,
} from "lucide-react";
import { PowerSplitMiniGame, CyberCipherMiniGame, LeveragePoolMiniGame } from "./MiniGames";
import { RoundTableMeeting, ROLE_ABILITIES } from "./RoundTableMeeting";
import { ShopAndCrafting } from "./ShopAndCrafting";
import { NewsGazetteSlideshow } from "./NewsGazetteSlideshow";
import { OperativeToken } from "./OakhavenMap3D";
import { OAKHAVEN_SECTORS } from "./oakhavenMapData";
import { Mastermind3DWorld } from "./Mastermind3DWorld";

// ============================================================
// A. UI THEMES SYSTEM (FULL REPAINT)
// ============================================================
type MastermindTheme = "cyberpunk" | "dieselpunk" | "classic";
const THEMES = {
  cyberpunk: {
    name: "Cyberpunk",
    icon: "🔵",
    primary: "#00f0ff",
    accent: "#f43f5e",
    bg: "#04060d",
    surface: "#09121f",
    border: "#0e3a5f",
    glow: "#00f0ff",
    badgeBg: "rgba(0, 240, 255, 0.15)",
    textGlow: "0 0 15px rgba(0, 240, 255, 0.4)",
    gridPattern: "rgba(0, 240, 255, 0.04)",
  },
  dieselpunk: {
    name: "Dieselpunk",
    icon: "🟠",
    primary: "#f59e0b",
    accent: "#ea580c",
    bg: "#100a04",
    surface: "#1f140a",
    border: "#78350f",
    glow: "#f59e0b",
    badgeBg: "rgba(245, 158, 11, 0.15)",
    textGlow: "0 0 15px rgba(245, 158, 11, 0.4)",
    gridPattern: "rgba(245, 158, 11, 0.04)",
  },
  classic: {
    name: "Obsidian",
    icon: "🟣",
    primary: "#a855f7",
    accent: "#ec4899",
    bg: "#07040d",
    surface: "#140a24",
    border: "#4c1d95",
    glow: "#a855f7",
    badgeBg: "rgba(168, 85, 247, 0.15)",
    textGlow: "0 0 15px rgba(168, 85, 247, 0.4)",
    gridPattern: "rgba(168, 85, 247, 0.04)",
  },
};

interface MastermindGameProps {
  roomState: RoomState;
  myId: string;
  onSubmitMinigameScore: (score: number) => void;
  onBuyItem: (item: MastermindItem) => void;
  onUseAbility: (abilityType: string, targetId?: string) => void;
  onVoteSuspect: (suspectId: string) => void;
  onReturnToLobby: () => void;
  onSkipTimer?: () => void;
  onBidAuction?: (slotId: string, bidAmount: number) => void;
  onClaimFreeCards?: () => void;
  onCraftItem?: (item: MastermindItem) => void;
  onMovePlayer?: (x: number, z: number, rotation: number, isMoving: boolean, skin?: string, sectorId?: string) => void;
  onCollectScrap?: (scrapId: string) => void;
  onSelectSkin?: (skin: string) => void;
}

const ROLE_ICONS: Record<string, string> = {
  sheriff: "⚖️", killer: "🔫", doctor: "🩺", thief: "🧤",
  soldier: "🛡️", joker: "🃏", wizard: "🔮", hacker: "💻",
};
const ROLE_COLORS: Record<string, string> = {
  sheriff: "#38bdf8", killer: "#f43f5e", doctor: "#10b981", thief: "#a855f7",
  soldier: "#3b82f6", joker: "#f97316", wizard: "#8b5cf6", hacker: "#06b6d4",
};
const HEALTH_ICONS: Record<string, string> = {
  healthy: "💚", wounded: "🩸", critical: "⚠️", dead: "💀",
};
const PHASE_INFO: Record<string, { label: string; icon: string; color: string }> = {
  role_reveal:          { label: "Role Reveal",         icon: "🃏", color: "text-amber-300" },
  minigame:             { label: "Mini-Game Terminal",   icon: "⚡", color: "text-cyan-300" },
  round_table_meeting:  { label: "Round Table Council", icon: "🪑", color: "text-purple-300" },
  shop_and_craft:       { label: "Shop & Crafting",     icon: "🛒", color: "text-emerald-300" },
  news_gazette:         { label: "Intel Transmission",  icon: "📰", color: "text-rose-300" },
  game_over:            { label: "Game Over",           icon: "🏆", color: "text-amber-400" },
};

export const MastermindGame: React.FC<MastermindGameProps> = ({
  roomState,
  myId,
  onSubmitMinigameScore,
  onBuyItem,
  onUseAbility,
  onVoteSuspect,
  onReturnToLobby,
  onSkipTimer,
  onBidAuction,
  onClaimFreeCards,
  onCraftItem,
  onMovePlayer,
  onCollectScrap,
  onSelectSkin,
}) => {
  const g = roomState.mastermindState as MastermindGameState | undefined;
  const [selectedSectorId, setSelectedSectorId] = useState("lockdown_dome");

  // A. Theme state
  const [theme, setTheme] = useState<MastermindTheme>("cyberpunk");
  const t = THEMES[theme];

  // B. Card flip state for role_reveal
  const [flippedIdx, setFlippedIdx] = useState<number | null>(null);

  // C. Round Table Council Ability States
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedAbility, setSelectedAbility] = useState<string | null>("normal1");
  const [isAbilityLockedIn, setIsAbilityLockedIn] = useState<boolean>(false);

  // D. Shop & Procurement Drawer State
  const [shopDrawerOpen, setShopDrawerOpen] = useState<boolean>(false);

  // E. Phase transition announcement
  const [showPhaseAnnounce, setShowPhaseAnnounce] = useState(false);
  const [announceText, setAnnounceText] = useState("");
  const prevPhaseRef = useRef("");

  const myPlayer = g?.players?.[myId];

  // Compute anonymous operative tokens for the 3D map
  const operativeTokens: OperativeToken[] = useMemo(() => {
    if (!g) return [];
    return Object.values(g.players).map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      sectorId: p.sectorId || "lockdown_dome",
      isMe: p.id === myId,
      activity: p.selectedAbilityType ? "active" : undefined,
    }));
  }, [g, myId]);

  // All players as array for rendering
  const allPlayers = useMemo(() => {
    if (!g) return [];
    return Object.values(g.players);
  }, [g]);

  // Phase transition effect
  useEffect(() => {
    if (!g) return;
    const phase = g.phase;
    if (phase !== prevPhaseRef.current) {
      prevPhaseRef.current = phase;
      setIsAbilityLockedIn(false);
      setSelectedTargetId(null);
      if (phase !== "role_reveal" && phase !== "game_over") {
        const phaseInfo = PHASE_INFO[phase] || { label: phase };
        setAnnounceText(`Round ${g.currentRound}  •  ${phaseInfo.label}`);
        setShowPhaseAnnounce(true);
        const tid = setTimeout(() => setShowPhaseAnnounce(false), 2800);
        return () => clearTimeout(tid);
      }
    }
  }, [g?.phase, g?.currentRound]);

  if (!g) {
    return (
      <div
        className="flex-1 flex items-center justify-center text-slate-400 font-mono text-sm"
        style={{ backgroundColor: "#060913" }}
      >
        <Bot className="w-6 h-6 mr-2 animate-pulse" />
        Connecting to Oakhaven Shelter Protocol...
      </div>
    );
  }

  const phase = g.phase;
  const phaseInfo = PHASE_INFO[phase] || { label: phase, icon: "⚙️", color: "text-slate-300" };
  const isHost = roomState.players[myId]?.isHost;

  // Handle Council Ability Confirmation
  const handleConfirmAbility = () => {
    if (!selectedAbility) return;
    onUseAbility(selectedAbility, selectedTargetId || undefined);
    setIsAbilityLockedIn(true);
  };

  // =========================================================================
  // GAME OVER SCREEN
  // =========================================================================
  if (phase === "game_over") {
    const winnerColor = g.winner === "town" ? "#10b981" : g.winner === "syndicate" ? "#f43f5e" : "#f97316";
    const winnerIcon = g.winner === "town" ? "🏛️" : g.winner === "syndicate" ? "💣" : "🃏";
    const winnerLabel = g.winner === "town" ? "Town Secured!" : g.winner === "syndicate" ? "Syndicate Wins!" : "Wildcard Victor!";

    return (
      <div
        className="flex-1 flex flex-col items-center justify-center text-white p-8 select-none"
        style={{ backgroundColor: t.bg }}
      >
        <div className="max-w-2xl w-full flex flex-col items-center gap-8">
          <div className="text-7xl animate-bounce">{winnerIcon}</div>
          <h2 className="text-4xl font-black tracking-widest uppercase text-center" style={{ color: winnerColor }}>
            {winnerLabel}
          </h2>
          {g.winnerReason && (
            <p className="text-slate-300 text-sm font-mono text-center">{g.winnerReason}</p>
          )}

          {/* Player Role Reveal Table */}
          <div
            className="w-full rounded-3xl p-6"
            style={{ backgroundColor: t.surface + "cc", border: `1px solid ${t.border}` }}
          >
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Identity Debrief – All Roles Revealed
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allPlayers.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl border flex items-center gap-3"
                  style={{ borderColor: ROLE_COLORS[p.role] + "55", background: ROLE_COLORS[p.role] + "11" }}
                >
                  <span className="text-2xl">{p.avatar}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{p.id === myId ? "YOU" : p.name}</div>
                    <div className="text-[11px] font-mono capitalize flex items-center gap-1" style={{ color: ROLE_COLORS[p.role] }}>
                      <span>{ROLE_ICONS[p.role]}</span>
                      <span>{p.role}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">{HEALTH_ICONS[p.health]} {p.health}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onReturnToLobby}
            className="px-10 py-3.5 text-white font-black rounded-2xl text-sm uppercase tracking-wider shadow-xl flex items-center gap-2 transition-all"
            style={{
              background: `linear-gradient(to right, ${t.primary}, ${t.accent})`,
              boxShadow: `0 10px 30px ${t.glow}44`,
            }}
          >
            <RotateCcw className="w-4 h-4" />
            Return to Party Lobby
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DIEGETIC PHASE 3D HUD OVERLAYS
  // =========================================================================
  const renderPhaseOverlay = () => {
    // 1. ROLE REVEAL OVERLAY (Single-Choice Card envelope)
    if (phase === "role_reveal") {
      const cardCount = Math.max(3, Math.min(allPlayers.length, 8));
      const isRevealed = flippedIdx !== null;
      const roleColor = myPlayer ? ROLE_COLORS[myPlayer.role] : t.primary;

      const handleSelectCard = (index: number) => {
        if (flippedIdx !== null) return;
        setFlippedIdx(index);
      };

      return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto pointer-events-auto">
          <div className="relative flex flex-col items-center gap-6 px-6 py-8 max-w-3xl w-full bg-slate-900/90 border border-cyan-500/40 rounded-3xl shadow-2xl backdrop-blur-xl">
            {/* Title */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div
                className="text-2xl sm:text-3xl font-black tracking-[0.4em] uppercase"
                style={{ color: t.primary, textShadow: t.textGlow }}
              >
                {isRevealed ? "ROLE REVEALED" : "CHOOSE YOUR FATE"}
              </div>
              <p className="text-xs font-mono text-slate-400">
                {isRevealed
                  ? "Your secret operative clearance is confirmed. Do not expose your identity."
                  : "Select 1 encrypted card to uncover your classified assignment. Choice cannot be changed."}
              </p>
            </div>

            {/* Card Fan Row */}
            <div className="flex items-center justify-center gap-3.5 flex-wrap">
              {Array.from({ length: cardCount }, (_, i) => {
                const isFlipped = flippedIdx === i;

                return (
                  <div
                    key={i}
                    onClick={() => handleSelectCard(i)}
                    style={{
                      perspective: "600px",
                      cursor: isRevealed ? (isFlipped ? "default" : "not-allowed") : "pointer",
                      opacity: isRevealed && !isFlipped ? 0.35 : 1,
                      transform: isRevealed && isFlipped ? "scale(1.08)" : "scale(1)",
                      transition: "transform 0.4s ease, opacity 0.4s ease",
                    }}
                    className="relative active:scale-95 transition-transform"
                  >
                    {/* Inner flipper */}
                    <div
                      style={{
                        width: "95px",
                        height: "135px",
                        position: "relative",
                        transformStyle: "preserve-3d",
                        transition: "transform 0.65s cubic-bezier(0.4,0,0.2,1)",
                        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                      }}
                    >
                      {/* FRONT FACE */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          backfaceVisibility: "hidden",
                          WebkitBackfaceVisibility: "hidden",
                          borderRadius: "14px",
                          border: `2px solid ${t.primary}`,
                          backgroundColor: t.surface,
                          boxShadow: `0 0 20px ${t.glow}44`,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <span style={{ fontSize: "1.9rem", opacity: 0.85 }}>🃏</span>
                        <div
                          style={{
                            fontSize: "10px",
                            fontFamily: "monospace",
                            color: t.primary,
                            letterSpacing: "0.15em",
                            fontWeight: 800,
                            textAlign: "center",
                            padding: "0 6px",
                          }}
                        >
                          ENCRYPTED
                        </div>
                      </div>

                      {/* BACK FACE */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          backfaceVisibility: "hidden",
                          WebkitBackfaceVisibility: "hidden",
                          transform: "rotateY(180deg)",
                          borderRadius: "14px",
                          border: `2px solid ${roleColor}`,
                          backgroundColor: t.surface,
                          boxShadow: `0 0 30px ${roleColor}55`,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          padding: "8px",
                        }}
                      >
                        {isFlipped && myPlayer ? (
                          <>
                            <span style={{ fontSize: "2rem" }}>{ROLE_ICONS[myPlayer.role]}</span>
                            <div
                              style={{
                                fontSize: "12px",
                                fontFamily: "monospace",
                                fontWeight: 900,
                                color: roleColor,
                                textTransform: "capitalize",
                                textAlign: "center",
                              }}
                            >
                              {myPlayer.role}
                            </div>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: "1.4rem" }}>🔒</span>
                            <div style={{ fontSize: "9px", fontFamily: "monospace", color: "#64748b" }}>
                              CLASSIFIED
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Role reveal detail panel */}
            {isRevealed && myPlayer && (
              <div
                className="flex flex-col items-center gap-3 p-6 rounded-3xl animate-fade-in"
                style={{
                  border: `2px solid ${roleColor}88`,
                  backgroundColor: t.surface,
                  boxShadow: `0 0 50px ${roleColor}33`,
                  minWidth: "280px",
                }}
              >
                <span style={{ fontSize: "3.5rem" }}>{ROLE_ICONS[myPlayer.role]}</span>
                <span
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 900,
                    color: roleColor,
                    textTransform: "capitalize",
                    letterSpacing: "0.1em",
                  }}
                >
                  {myPlayer.role}
                </span>
                <span className="text-sm font-mono text-center max-w-md" style={{ color: t.primary }}>
                  {myPlayer.team === "town" && "🏛️ You are part of the Town. Secure the facility & synthesize the Panacea!"}
                  {myPlayer.team === "syndicate" && "💀 You are the Syndicate. Sabotage the vaults & detonate the core!"}
                  {myPlayer.team === "neutral" && "🃏 You are a Wildcard. Manipulate both sides to achieve victory!"}
                </span>
                <div className="flex items-center gap-3 mt-2 px-4 py-2 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <span className="text-2xl">{myPlayer.avatar}</span>
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-bold text-slate-200">{myPlayer.name}</span>
                    <span className="text-[10px] text-slate-500">Your anonymous alias this match</span>
                  </div>
                </div>
              </div>
            )}

            {/* Timer countdown */}
            <div className="flex items-center gap-2 font-mono text-xs" style={{ color: t.primary + "bb" }}>
              <Clock className="w-4 h-4 animate-pulse" />
              <span>
                Mini-game begins in{" "}
                <span style={{ color: "#fbbf24", fontWeight: 900 }}>{g.timer}s</span>
              </span>
            </div>
          </div>
        </div>
      );
    }

    // 2. MINI-GAME OVERLAY (In-World Terminal Screen)
    if (phase === "minigame") {
      const miniGame = g.currentMiniGame || "power_split";
      const handleComplete = (_coins: number, score: number) => {
        onSubmitMinigameScore(score);
      };

      return (
        <div className="flex-1 flex items-center justify-center p-3 sm:p-5 overflow-y-auto pointer-events-auto bg-slate-950/60 backdrop-blur-sm">
          {miniGame === "power_split" && <PowerSplitMiniGame onComplete={handleComplete} />}
          {miniGame === "cyber_cipher" && <CyberCipherMiniGame onComplete={handleComplete} />}
          {miniGame === "leverage_pool" && <LeveragePoolMiniGame onComplete={handleComplete} />}
        </div>
      );
    }

    // 3. ROUND TABLE MEETING (Live 3D Council Deck & 3D Targeting Laser)
    if (phase === "round_table_meeting") {
      if (!myPlayer) return null;
      const abilities = ROLE_ABILITIES[myPlayer.role] || ROLE_ABILITIES.sheriff;

      return (
        <div className="flex-1 flex flex-col justify-between p-3 sm:p-6 pointer-events-none">
          {/* Top Council Banner */}
          <div className="flex items-center justify-between pointer-events-auto bg-slate-950/85 border border-cyan-500/40 rounded-2xl px-4 py-2.5 backdrop-blur-md max-w-4xl w-full mx-auto shadow-2xl">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <div>
                <span className="text-xs font-mono font-black text-cyan-300 uppercase tracking-wider block">
                  Phase 2: 3D Council Chamber
                </span>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:block">
                  Select a target operative below to aim your 3D targeting laser!
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-mono">Deliberation:</span>
              <span className="font-mono text-sm font-black text-amber-400">{g.timer}s</span>
            </div>
          </div>

          {/* Bottom Action & Ability Deck */}
          <div className="pointer-events-auto w-full max-w-4xl mx-auto bg-slate-950/95 border border-cyan-500/50 rounded-3xl p-4 shadow-2xl backdrop-blur-xl flex flex-col gap-3">
            {/* Header: Role & Passive */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Your Clearance:</span>
                <span className="text-sm font-black uppercase tracking-wider" style={{ color: ROLE_COLORS[myPlayer.role] }}>
                  {ROLE_ICONS[myPlayer.role]} {myPlayer.role}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-950/70 border border-purple-500/40 text-[10px] text-purple-300 font-bold">
                <span>{abilities.passive.icon}</span>
                <span>Passive: {abilities.passive.name}</span>
              </div>
            </div>

            {/* 3 Active Abilities */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Normal 1 */}
              <button
                onClick={() => setSelectedAbility("normal1")}
                disabled={isAbilityLockedIn}
                className={`p-2.5 rounded-2xl border text-left transition ${
                  selectedAbility === "normal1"
                    ? "bg-cyan-950/90 border-cyan-400 shadow-md shadow-cyan-950"
                    : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{abilities.normal1.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-white">{abilities.normal1.name}</div>
                    <span className="text-[10px] text-slate-400 line-clamp-1">{abilities.normal1.desc}</span>
                  </div>
                </div>
              </button>

              {/* Normal 2 */}
              <button
                onClick={() => setSelectedAbility("normal2")}
                disabled={isAbilityLockedIn}
                className={`p-2.5 rounded-2xl border text-left transition ${
                  selectedAbility === "normal2"
                    ? "bg-cyan-950/90 border-cyan-400 shadow-md shadow-cyan-950"
                    : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{abilities.normal2.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-white">{abilities.normal2.name}</div>
                    <span className="text-[10px] text-slate-400 line-clamp-1">{abilities.normal2.desc}</span>
                  </div>
                </div>
              </button>

              {/* Ultimate */}
              <button
                onClick={() => setSelectedAbility("ultimate")}
                disabled={isAbilityLockedIn}
                className={`p-2.5 rounded-2xl border text-left transition ${
                  selectedAbility === "ultimate"
                    ? "bg-purple-950/90 border-purple-400 shadow-md shadow-purple-950"
                    : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{abilities.ultimate.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-purple-300">{abilities.ultimate.name}</div>
                    <span className="text-[10px] text-slate-400 line-clamp-1">{abilities.ultimate.desc}</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Operative Target Selector (with 3D Laser Targeting) */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 font-bold">
                🎯 Target Operative (Aim 3D Laser):
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {allPlayers.map((p) => {
                  const isMe = p.id === myId;
                  const isSelected = selectedTargetId === p.id;
                  if (isMe) return null;

                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedTargetId(p.id)}
                      disabled={isAbilityLockedIn || p.health === "dead"}
                      className={`px-3 py-1.5 rounded-2xl border text-xs font-bold flex items-center gap-1.5 shrink-0 transition ${
                        isSelected
                          ? "bg-rose-950 border-rose-500 text-rose-200 shadow-md shadow-rose-900"
                          : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <span>{p.avatar}</span>
                      <span>{p.name}</span>
                      <span className="text-[10px]">{HEALTH_ICONS[p.health]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Confirm Ability Button */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs font-mono text-cyan-300">
                {selectedTargetId
                  ? `Laser Locked on: ${allPlayers.find((p) => p.id === selectedTargetId)?.name}`
                  : "Select an operative to aim"}
              </div>

              <button
                onClick={handleConfirmAbility}
                disabled={isAbilityLockedIn}
                className={`px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl flex items-center gap-2 transition ${
                  isAbilityLockedIn
                    ? "bg-emerald-950 border border-emerald-500 text-emerald-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 border border-white"
                }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isAbilityLockedIn ? "Ability Locked In ✓" : "Confirm Ability"}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 4. SHOP AND CRAFTING OVERLAY (Free Roam + Scrap Looting + Drawer trigger)
    if (phase === "shop_and_craft" || phase === "shop") {
      return (
        <div className="flex-1 flex flex-col justify-between p-3 pointer-events-none">
          {/* Top Info Banner */}
          <div className="flex items-center justify-between pointer-events-auto bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-2 backdrop-blur-md max-w-lg shadow-xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="text-xs font-mono font-black text-emerald-300 uppercase tracking-wider block">
                  Phase 3: Roam, Loot Scraps & Trade
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Walk to Craft Bench in 3D or click button below
                </span>
              </div>
            </div>
            <div className="text-xs font-mono text-amber-400 font-black px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800">
              {g.timer}s
            </div>
          </div>

          {/* Quick Shop Action Pill */}
          <div className="pointer-events-auto flex items-center justify-center mb-1">
            <button
              onClick={() => setShopDrawerOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-2xl shadow-amber-500/40 border border-white flex items-center gap-2 active:scale-95 transition"
            >
              <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
              <span>Open Black Market & Crafting Bench [B]</span>
            </button>
          </div>
        </div>
      );
    }

    // 5. NEWS GAZETTE OVERLAY
    if (phase === "news_gazette" || phase === "morning_news") {
      return (
        <div className="flex-1 flex items-center justify-center p-4 pointer-events-auto bg-slate-950/60 backdrop-blur-sm overflow-hidden">
          <NewsGazetteSlideshow slides={g.newsSlides || []} round={g.currentRound} timer={g.timer} />
        </div>
      );
    }

    return null;
  };

  // =========================================================================
  // MAIN RENDER — 100% 3D WORLD WITH DIEGETIC HUDs
  // =========================================================================
  return (
    <div
      className="flex-1 flex flex-col h-full text-white overflow-hidden select-none relative"
      style={{ backgroundColor: t.bg }}
    >
      {/* 1. PERSISTENT 3D WORLD — ENTIRE GAME ENGINE (ALWAYS MOUNTED & VISIBLE) */}
      <div className="absolute inset-0 z-0">
        <Mastermind3DWorld
          gameState={g}
          myId={myId}
          phase={phase}
          themePrimary={t.primary}
          selectedTargetId={selectedTargetId}
          onMovePlayer={onMovePlayer}
          onCollectScrap={onCollectScrap}
          onSelectSkin={onSelectSkin}
          onUseAbility={onUseAbility}
          onInteract={(type) => {
            if (type === "craft" || type === "terminal") {
              setShopDrawerOpen(true);
            }
          }}
          onOpenShop={() => setShopDrawerOpen(true)}
          hideDefaultHud={phase === "round_table_meeting" || shopDrawerOpen}
        />
      </div>

      {/* 2. PHASE TRANSITION ANNOUNCE OVERLAY */}
      {showPhaseAnnounce && (
        <>
          <style>{`
            @keyframes phaseIn {
              0%   { opacity: 0; transform: scale(0.6); }
              30%  { opacity: 1; transform: scale(1); }
              70%  { opacity: 1; transform: scale(1); }
              100% { opacity: 0; transform: scale(0.3); }
            }
          `}</style>
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md pointer-events-none">
            <div
              style={{
                animation: "phaseIn 2.8s ease forwards",
                borderColor: t.primary,
                boxShadow: `0 0 60px ${t.glow}55, inset 0 0 40px ${t.glow}22`,
                backgroundColor: t.surface,
              }}
              className="p-8 rounded-3xl border-2 flex flex-col items-center gap-3 max-w-xl w-full mx-4 shadow-2xl text-center"
            >
              <div
                style={{
                  fontSize: "3.2rem",
                  fontWeight: 900,
                  letterSpacing: "0.25em",
                  color: t.primary,
                  textShadow: t.textGlow,
                }}
              >
                {announceText.split("•")[0]?.trim()}
              </div>
              <div
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  color: t.accent,
                  letterSpacing: "0.15em",
                }}
              >
                {announceText.split("•")[1]?.trim()}
              </div>
              <div className="text-[11px] font-mono tracking-widest text-slate-400 mt-2 uppercase">
                [ PROTOCOL SYNCHRONIZATION ACTIVE ]
              </div>
            </div>
          </div>
        </>
      )}

      {/* 3. TOP STATUS BAR (Floating Translucent Glass Bar) */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 backdrop-blur-md z-30"
        style={{ backgroundColor: t.surface + "cc", borderBottom: `1px solid ${t.primary}33` }}
      >
        {/* Phase Info */}
        <div className="flex items-center gap-3">
          <span className={`text-lg ${phaseInfo.color}`}>{phaseInfo.icon}</span>
          <div className="flex flex-col">
            <span className={`text-xs font-black uppercase tracking-widest ${phaseInfo.color}`}>
              {phaseInfo.label}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Round {g.currentRound} of {g.totalRounds}
            </span>
          </div>
        </div>

        {/* Round Progress Pips */}
        <div className="hidden sm:flex items-center gap-1.5">
          {Array.from({ length: g.totalRounds }, (_, i) => (
            <div
              key={i}
              className="w-5 h-1.5 rounded-full transition-all"
              style={{
                backgroundColor:
                  i + 1 < g.currentRound
                    ? t.primary
                    : i + 1 === g.currentRound
                    ? "#fbbf24"
                    : t.border,
                animation: i + 1 === g.currentRound ? "pulse 1.5s infinite" : undefined,
              }}
            />
          ))}
        </div>

        {/* Right side: Shop Button + Themes + Timer */}
        <div className="flex items-center gap-2">
          {/* Shop Button */}
          {phase === "shop_and_craft" && (
            <button
              onClick={() => setShopDrawerOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Shop & Craft</span>
            </button>
          )}

          {/* Theme selector dots */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTheme("cyberpunk")}
              title="Cyberpunk"
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                backgroundColor: "#38bdf8",
                border: theme === "cyberpunk" ? "2px solid #fff" : "2px solid transparent",
              }}
            />
            <button
              onClick={() => setTheme("dieselpunk")}
              title="Dieselpunk"
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                backgroundColor: "#f97316",
                border: theme === "dieselpunk" ? "2px solid #fff" : "2px solid transparent",
              }}
            />
            <button
              onClick={() => setTheme("classic")}
              title="Obsidian"
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                backgroundColor: "#a855f7",
                border: theme === "classic" ? "2px solid #fff" : "2px solid transparent",
              }}
            />
          </div>

          {/* Timer Badge */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-2xl bg-slate-900 border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-xs font-black text-amber-300">{g.timer}s</span>
          </div>

          {/* Host Skip button */}
          {isHost && onSkipTimer && (
            <button
              onClick={onSkipTimer}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 border border-slate-700 flex items-center gap-1"
            >
              <FastForward className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Skip</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. PHASE HUD / INTERACTIVE 3D OVERLAYS */}
      <div className="relative z-10 flex-1 flex flex-col pointer-events-none overflow-hidden">
        {renderPhaseOverlay()}
      </div>

      {/* 5. SLIDE-IN BLACK MARKET & CRAFTING DRAWER */}
      {shopDrawerOpen && myPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-sm pointer-events-auto">
          <div className="w-full max-w-4xl h-full bg-slate-900 border-l border-cyan-500/40 p-4 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-black uppercase tracking-wider text-cyan-300">
                  Facility Black Market & Crafting Lab
                </span>
              </div>
              <button
                onClick={() => setShopDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-rose-900/80 flex items-center justify-center text-slate-300 hover:text-white font-bold transition"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ShopAndCrafting
                myPlayer={myPlayer}
                auctionSlots={g.auctionSlots || []}
                round={g.currentRound}
                timer={g.timer}
                selectedSectorId={selectedSectorId}
                onSelectSector={setSelectedSectorId}
                tokens={operativeTokens}
                vaultBreaches={g.vaultBreaches}
                isFortified={g.domeFortified}
                onBidAuction={onBidAuction || (() => {})}
                onBuyItem={onBuyItem}
                onCraftItem={onCraftItem || onBuyItem}
                onClaimFreeCards={onClaimFreeCards || (() => {})}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
