"use client";

import React, { useState, useMemo } from "react";
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

  if (!g) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-slate-400 font-mono text-sm">
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
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-white p-8 select-none">
        <div className="max-w-2xl w-full flex flex-col items-center gap-8">
          <div className="text-7xl animate-bounce">{winnerIcon}</div>
          <h2 className="text-4xl font-black tracking-widest uppercase text-center" style={{ color: winnerColor }}>
            {winnerLabel}
          </h2>
          {g.winnerReason && (
            <p className="text-slate-300 text-sm font-mono text-center">{g.winnerReason}</p>
          )}

          {/* Player Role Reveal Table */}
          <div className="w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
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
            className="px-10 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-2xl text-sm uppercase tracking-wider shadow-xl shadow-cyan-600/30 flex items-center gap-2 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Return to Party Lobby
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ROLE REVEAL PHASE
  // =========================================================================
  if (phase === "role_reveal") {
    const roleColor = myPlayer ? ROLE_COLORS[myPlayer.role] : "#38bdf8";

    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-white p-8 select-none">
        <div className="max-w-lg w-full flex flex-col items-center gap-8">
          {/* Dramatic animated card reveal */}
          <div
            className="w-72 h-96 rounded-3xl border-2 flex flex-col items-center justify-center shadow-2xl animate-pulse"
            style={{ borderColor: roleColor, backgroundColor: roleColor + "14", boxShadow: `0 0 60px ${roleColor}30` }}
          >
            <div className="text-7xl mb-4 animate-bounce">
              {myPlayer ? ROLE_ICONS[myPlayer.role] : "🃏"}
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
              Your Secret Role
            </span>
            <h2 className="text-3xl font-black capitalize tracking-wide" style={{ color: roleColor }}>
              {myPlayer?.role || "???"}
            </h2>
            <div className="mt-4 px-4 py-2 rounded-xl bg-slate-950/80 text-center mx-4">
              <span className="text-xs text-slate-300 font-mono">
                {myPlayer?.team === "town" && "🏛️ You are part of the Town. Protect the shelter!"}
                {myPlayer?.team === "syndicate" && "💀 You are the Syndicate. Chaos is your ally!"}
                {myPlayer?.team === "neutral" && "🃏 You are a Wildcard. Write your own fate!"}
              </span>
            </div>
          </div>

          {/* Anonymous Operative Identity for this match */}
          <div className="text-center flex flex-col items-center gap-1">
            <span className="text-2xl">{myPlayer?.avatar}</span>
            <span className="font-mono text-sm font-bold text-slate-300">{myPlayer?.name}</span>
            <span className="text-xs text-slate-500">Your anonymous identity this match</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 font-mono text-xs">
            <Clock className="w-4 h-4 animate-pulse" />
            <span>Mini-game begins in <span className="text-amber-400 font-bold">{g.timer}s</span></span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SHARED CHROME: Phase Header + Player Roster (all non-minigame / non-reveal phases)
  // =========================================================================

  const renderPhaseContent = () => {
    // ---- MINI-GAME PHASE ----
    if (phase === "minigame") {
      const miniGame = g.currentMiniGame || "power_split";

      const handleComplete = (coins: number, score: number) => {
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
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-white overflow-hidden select-none">
      {/* TOP STATUS BAR */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-cyan-500/20 backdrop-blur-md z-30">
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
              className={`w-5 h-1.5 rounded-full transition-all ${
                i + 1 < g.currentRound
                  ? "bg-cyan-500"
                  : i + 1 === g.currentRound
                  ? "bg-amber-400 animate-pulse"
                  : "bg-slate-800"
              }`}
            />
          ))}
        </div>

        {/* Timer + Host Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-sm font-black text-amber-300">{g.timer}s</span>
          </div>
          {isHost && onSkipTimer && (
            <button
              onClick={onSkipTimer}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all"
              title="Host Skip Timer"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SIDE PLAYER ROSTER - Narrow vertical strip showing anonymous operative status */}
      <div className="flex-1 flex overflow-hidden">
        {/* Operative Roster */}
        <div className="hidden lg:flex flex-col w-16 xl:w-20 bg-slate-900/80 border-r border-slate-800/60 items-center py-3 gap-2 overflow-y-auto flex-shrink-0">
          {allPlayers.map((p) => (
            <div
              key={p.id}
              className="flex flex-col items-center gap-1 px-1"
              title={`${p.name} • ${p.role} • ${p.health}`}
            >
              <div
                className="relative w-9 h-9 rounded-xl flex items-center justify-center text-lg border transition-all"
                style={{
                  borderColor: p.id === myId ? ROLE_COLORS[p.role] : "#334155",
                  backgroundColor: (p.id === myId ? ROLE_COLORS[p.role] : "#0f172a") + "33",
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
