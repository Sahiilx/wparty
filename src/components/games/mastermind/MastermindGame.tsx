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
} from "lucide-react";
import { PowerSplitMiniGame, CyberCipherMiniGame, LeveragePoolMiniGame } from "./MiniGames";
import { RoundTableMeeting } from "./RoundTableMeeting";
import { ShopAndCrafting } from "./ShopAndCrafting";
import { NewsGazetteSlideshow } from "./NewsGazetteSlideshow";
import { OperativeToken } from "./OakhavenMap3D";
import { OAKHAVEN_SECTORS } from "./oakhavenMapData";

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
  minigame:             { label: "Mini-Game",           icon: "⚡", color: "text-cyan-300" },
  round_table_meeting:  { label: "Round Table",         icon: "🪑", color: "text-purple-300" },
  shop_and_craft:       { label: "Shop & Crafting",     icon: "🛒", color: "text-emerald-300" },
  news_gazette:         { label: "Intel Gazette",       icon: "📰", color: "text-rose-300" },
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
}) => {
  const g = roomState.mastermindState as MastermindGameState | undefined;
  const [selectedSectorId, setSelectedSectorId] = useState("lockdown_dome");

  // A. Theme state
  const [theme, setTheme] = useState<MastermindTheme>("cyberpunk");
  const t = THEMES[theme];

  // B. Card flip state for role_reveal
  const [flippedIdx, setFlippedIdx] = useState<number | null>(null);

  // C. Phase transition announcement
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

  // C. Phase transition effect
  useEffect(() => {
    if (!g) return;
    const phase = g.phase;
    if (phase !== prevPhaseRef.current) {
      prevPhaseRef.current = phase;
      if (phase !== "role_reveal" && phase !== "game_over") {
        const phaseInfo = PHASE_INFO[phase] || { label: phase };
        setAnnounceText(`Round ${g.currentRound}  •  ${phaseInfo.label}`);
        setShowPhaseAnnounce(true);
        const tid = setTimeout(() => setShowPhaseAnnounce(false), 2800);
        return () => clearTimeout(tid);
      }
    }
  }, [g?.phase]);

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
  // B. ROLE REVEAL PHASE — Single Choice Card Selection (Locked once clicked)
  // =========================================================================
  if (phase === "role_reveal") {
    const cardCount = Math.max(3, Math.min(allPlayers.length, 8));
    const isRevealed = flippedIdx !== null;
    const roleColor = myPlayer ? ROLE_COLORS[myPlayer.role] : t.primary;

    const handleSelectCard = (index: number) => {
      if (flippedIdx !== null) return; // Player can only select ONE card and cannot change it!
      setFlippedIdx(index);
    };

    return (
      <div
        className="flex-1 flex flex-col items-center justify-center text-white select-none relative overflow-hidden"
        style={{ backgroundColor: t.bg }}
      >
        {/* Full-screen background ambiance */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at center, ${t.glow}18 0%, transparent 70%)` }} />

        <div className="relative z-10 flex flex-col items-center gap-8 px-4 max-w-3xl w-full">
          {/* Title */}
          <div className="flex flex-col items-center gap-1.5 text-center">
            <div
              className="text-3xl font-black tracking-[0.4em] uppercase"
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
                      <div style={{ position: "absolute", inset: "6px", border: `1px solid ${t.primary}33`, borderRadius: "10px", pointerEvents: "none" }} />
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
                          <div
                            style={{
                              fontSize: "9px",
                              fontFamily: "monospace",
                              fontWeight: 700,
                              color: "#64748b",
                              textAlign: "center",
                            }}
                          >
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

          {/* Role reveal detail panel — shown after clicked card flips */}
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

  // =========================================================================
  // SHARED CHROME: Phase Header + Player Roster
  // =========================================================================

  const renderPhaseContent = () => {
    // ---- MINI-GAME PHASE ----
    if (phase === "minigame") {
      const miniGame = g.currentMiniGame || "power_split";

      const handleComplete = (_coins: number, score: number) => {
        onSubmitMinigameScore(score);
      };

      return (
        <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
          {miniGame === "power_split" && (
            <PowerSplitMiniGame onComplete={handleComplete} />
          )}
          {miniGame === "cyber_cipher" && (
            <CyberCipherMiniGame onComplete={handleComplete} />
          )}
          {miniGame === "leverage_pool" && (
            <LeveragePoolMiniGame onComplete={handleComplete} />
          )}
        </div>
      );
    }

    // ---- ROUND TABLE MEETING PHASE ----
    if (phase === "round_table_meeting") {
      if (!myPlayer) return null;
      return (
        <div className="flex-1 overflow-hidden">
          <RoundTableMeeting
            players={allPlayers}
            myPlayer={myPlayer}
            timer={g.timer}
            onUseAbility={onUseAbility}
          />
        </div>
      );
    }

    // ---- SHOP AND CRAFTING PHASE ----
    if (phase === "shop_and_craft" || phase === "shop") {
      if (!myPlayer) return null;
      return (
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
      );
    }

    // ---- NEWS GAZETTE PHASE ----
    if (phase === "news_gazette" || phase === "morning_news") {
      return (
        <div className="flex-1 overflow-hidden">
          <NewsGazetteSlideshow
            slides={g.newsSlides || []}
            round={g.currentRound}
            timer={g.timer}
          />
        </div>
      );
    }

    return null;
  };

  // =========================================================================
  // MAIN RENDER
  // =========================================================================
  return (
    <div
      className="flex-1 flex flex-col h-full text-white overflow-hidden select-none relative"
      style={{ backgroundColor: t.bg }}
    >
      {/* Sci-Fi Grid Backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, ${t.gridPattern} 1px, transparent 1px), linear-gradient(to bottom, ${t.gridPattern} 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />
      {/* C. PHASE TRANSITION ANNOUNCE OVERLAY */}
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
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md pointer-events-none">
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

      {/* TOP STATUS BAR */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 backdrop-blur-md z-30"
        style={{ backgroundColor: t.surface + "ee", borderBottom: `1px solid ${t.primary}33` }}
      >
        {/* Phase Info */}
        <div className="flex items-center gap-3">
          <span className={`text-lg ${phaseInfo.color}`}>{phaseInfo.icon}</span>
          <div className="flex flex-col">
            <span className={`text-xs font-black uppercase tracking-widest ${phaseInfo.color}`}>
              {phaseInfo.label}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
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

        {/* Right side: Theme buttons + Timer + Host Controls */}
        <div className="flex items-center gap-2">
          {/* A. Theme selector buttons */}
          <div className="flex items-center gap-1 mr-1">
            <button
              onClick={() => setTheme("cyberpunk")}
              title="Cyberpunk"
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: "#38bdf8",
                border: theme === "cyberpunk" ? "2px solid #fff" : "2px solid transparent",
                cursor: "pointer",
                transition: "border-color 0.2s",
                fontSize: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {theme === "cyberpunk" && <span style={{ fontSize: "8px" }}>✓</span>}
            </button>
            <button
              onClick={() => setTheme("dieselpunk")}
              title="Dieselpunk"
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: "#f97316",
                border: theme === "dieselpunk" ? "2px solid #fff" : "2px solid transparent",
                cursor: "pointer",
                transition: "border-color 0.2s",
                fontSize: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {theme === "dieselpunk" && <span style={{ fontSize: "8px" }}>✓</span>}
            </button>
            <button
              onClick={() => setTheme("classic")}
              title="Classic"
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: "#8b5cf6",
                border: theme === "classic" ? "2px solid #fff" : "2px solid transparent",
                cursor: "pointer",
                transition: "border-color 0.2s",
                fontSize: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {theme === "classic" && <span style={{ fontSize: "8px" }}>✓</span>}
            </button>
          </div>

          {/* Timer */}
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-xl"
            style={{ backgroundColor: t.border + "88", border: `1px solid ${t.border}` }}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-sm font-black text-amber-300">{g.timer}s</span>
          </div>

          {isHost && onSkipTimer && (
            <button
              onClick={onSkipTimer}
              className="p-2 rounded-xl transition-all"
              style={{
                backgroundColor: t.border + "88",
                border: `1px solid ${t.border}`,
                color: "#cbd5e1",
              }}
              title="Host Skip Timer"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SIDE PLAYER ROSTER + MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* Operative Roster */}
        <div
          className="hidden lg:flex flex-col w-16 xl:w-20 items-center py-3 gap-2 overflow-y-auto flex-shrink-0"
          style={{ backgroundColor: t.surface + "cc", borderRight: `1px solid ${t.border}66` }}
        >
          {allPlayers.map((p) => (
            <div
              key={p.id}
              className="flex flex-col items-center gap-1 px-1"
              title={`${p.name} • ${p.role} • ${p.health}`}
            >
              <div
                className="relative w-9 h-9 rounded-xl flex items-center justify-center text-lg border transition-all"
                style={{
                  borderColor: p.id === myId ? ROLE_COLORS[p.role] : t.border,
                  backgroundColor: (p.id === myId ? ROLE_COLORS[p.role] : t.surface) + "33",
                  opacity: p.health === "dead" ? 0.35 : 1,
                }}
              >
                <span>{p.avatar}</span>
                {p.health === "dead" && (
                  <span className="absolute inset-0 flex items-center justify-center text-xs rounded-xl bg-black/70">💀</span>
                )}
                {p.health === "wounded" && (
                  <span className="absolute -top-0.5 -right-0.5 text-[10px]">🩸</span>
                )}
              </div>
              <span className="text-[8px] font-mono text-slate-500 max-w-full text-center leading-tight truncate w-14">
                {p.id === myId ? "YOU" : p.name.split("-")[1] || p.name.slice(0, 4)}
              </span>
            </div>
          ))}
        </div>

        {/* MAIN PHASE CONTENT */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {renderPhaseContent()}
        </div>
      </div>
    </div>
  );
};
