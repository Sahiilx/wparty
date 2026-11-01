"use client";

import React, { useState } from "react";
import { Crown, Copy, Check, Palette, PhoneCall, Play, Swords, Users, Sparkles, HelpCircle, Eye, Sliders, Edit3, Crosshair, Brain } from "lucide-react";
import { RoomState, GameId, RoomSettings } from "../../../party/types";
import { copyToClipboard } from "@/lib/clipboard";
import { ProfileModal } from "./ProfileModal";

interface LobbyViewProps {
  roomState: RoomState;
  myId: string;
  onSelectGame: (gameId: GameId) => void;
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
  onUpdateProfile: (name: string, avatar: string) => void;
  onToggleReady: () => void;
  onStartGame: () => void;
}

const AVAILABLE_GAMES: {
  id: GameId;
  name: string;
  badge?: string;
  desc: string;
  icon: typeof Palette;
  color: string;
  minPlayers: number;
  category: "creative" | "brain";
}[] = [
  // --- Brain & Social Deduction Games ---
  {
    id: "mastermind",
    name: "🔫 Mastermind Protocol (Devil's Plan)",
    badge: "5+ PLAYERS",
    desc: "Devil's Plan deception! Secret roles (Killer, Sheriff, Doctor, Soldier, Thief). Compete in financial mini-games, purchase tactical items, and deliberate in tribunal!",
    icon: Crosshair,
    color: "from-rose-600 via-purple-600 to-amber-600",
    minPlayers: 5,
    category: "brain",
  },
  {
    id: "word_imposter",
    name: "🕵️ Word Imposter (Spy Among Us)",
    badge: "SOCIAL DEDUCTION",
    desc: "Everyone gets the same secret word except one player gets a sneaky alternative. Give 1-word clues and vote out the spy!",
    icon: Users,
    color: "from-rose-500 via-purple-600 to-slate-900",
    minPlayers: 3,
    category: "brain",
  },
  {
    id: "quiz_kbc",
    name: "💰 Crorepati Quiz (15 Qs)",
    badge: "KBC MODE",
    desc: "15 questions with 4 lifelines (50:50, Audience Poll, 2x Dip, Skip). Players lock answers simultaneously until final reveal!",
    icon: Sparkles,
    color: "from-amber-400 via-yellow-600 to-blue-950",
    minPlayers: 1,
    category: "brain",
  },
  // --- Creative & Casual Games ---
  {
    id: "skribbl_duel",
    name: "⚔️ Duo Duel (Speed Battle)",
    badge: "POPULAR",
    desc: "Two players draw the same word simultaneously! Audience only sees both boards and races to guess.",
    icon: Swords,
    color: "from-rose-500 via-amber-500 to-red-600",
    minPlayers: 2,
    category: "creative",
  },
  {
    id: "gartic",
    name: "📞 Telephone Tale (Whisper Chain)",
    badge: "TEAM CHAIN",
    desc: "Pass the secret: write a prompt, shuffle & draw, shuffle & guess, then view the hilarious slideshow album!",
    icon: PhoneCall,
    color: "from-blue-500 to-indigo-600",
    minPlayers: 2,
    category: "creative",
  },
  {
    id: "mystery_reveal",
    name: "🔍 Silhouette Showdown (Shadow Reveal)",
    badge: "NEW",
    desc: "Web image browser + smart auto-background removal, magnetic lasso masking, and custom background colors!",
    icon: Eye,
    color: "from-purple-500 via-fuchsia-500 to-indigo-600",
    minPlayers: 2,
    category: "creative",
  },
  {
    id: "word_fortune",
    name: "🎡 Word Wheel (Fortune Puzzle)",
    badge: "NEW",
    desc: "Wheel of Fortune style: pick a phrase, and friends guess letters on a game-show board or solve it all!",
    icon: HelpCircle,
    color: "from-emerald-500 to-teal-600",
    minPlayers: 2,
    category: "creative",
  },
  {
    id: "skribbl",
    name: "Doodle Dash (Classic)",
    desc: "Classic rotation: one drawer picks a secret word while everyone else guesses in live chat.",
    icon: Palette,
    color: "from-amber-500 to-orange-600",
    minPlayers: 1,
    category: "creative",
  },
];

const TIMER_OPTIONS = [45, 60, 75, 90, 120, 150, 180, 240];
const ROUND_OPTIONS = [1, 2, 3, 5, 7, 10];

export function LobbyView({
  roomState,
  myId,
  onSelectGame,
  onUpdateSettings,
  onUpdateProfile,
  onToggleReady,
  onStartGame,
}: LobbyViewProps) {
  const [copied, setCopied] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isHost = roomState.hostId === myId || Boolean(roomState.players[myId]?.isHost);
  const me = roomState.players[myId];
  const players = Object.values(roomState.players).filter((p) => p.isConnected);

  const handleCopyLink = async () => {
    if (typeof window !== "undefined") {
      const ok = await copyToClipboard(window.location.href);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full gap-4 max-w-4xl mx-auto overflow-y-auto pr-1">
      {/* Lobby Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl flex-shrink-0">
        <div className="flex items-center gap-4">
          <div
            onClick={() => setShowProfileModal(true)}
            className="relative cursor-pointer group"
            title="Click to edit avatar & nickname"
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-3xl group-hover:scale-105 transition-transform">
              {me?.avatar || "🎉"}
            </div>
            <div className="absolute -bottom-1 -right-1 p-1 bg-indigo-600 text-white rounded-full shadow">
              <Edit3 className="w-3 h-3" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
                Party Room Code
              </span>
              <button
                onClick={() => setShowProfileModal(true)}
                className="text-[11px] text-slate-400 hover:text-white underline decoration-slate-600"
              >
                (Edit Name)
              </button>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-3xl font-mono font-black text-white tracking-widest">
                {roomState.code}
              </span>
              <button
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  copied
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Link Copied!" : "Copy Invite Link"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Start Game Action */}
        <div>
          {isHost ? (
            (() => {
              const selectedGame = AVAILABLE_GAMES.find((g) => g.id === roomState.selectedGameId);
              const minReq = selectedGame?.minPlayers ?? 1;
              const hasEnoughPlayers = players.length >= minReq;

              return (
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={onStartGame}
                    disabled={!hasEnoughPlayers}
                    className="py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:hover:from-emerald-600 disabled:hover:to-teal-600 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center gap-2 text-sm transition-all hover:scale-105 active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Start Game Now</span>
                  </button>
                  {!hasEnoughPlayers && (
                    <span className="text-[10px] text-amber-400 font-bold">
                      Requires at least {minReq} players ({players.length} in room)
                    </span>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>Waiting for party leader to start...</span>
            </div>
          )}
        </div>
      </div>

      {/* Game Mode Selector Cards */}
      {/* Game Mode Selector with Categories */}
      <div className="flex flex-col gap-5">
        {/* Category 1: Brain & Strategy */}
        <div>
          <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-2.5 flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <span>🧠 Strategy & Social Deduction / Brain Games</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {AVAILABLE_GAMES.filter((g) => g.category === "brain").map((game) => {
              const isSelected = roomState.selectedGameId === game.id;
              const Icon = game.icon;

              return (
                <div
                  key={game.id}
                  onClick={() => isHost && onSelectGame(game.id)}
                  className={`relative p-3.5 rounded-3xl border transition-all ${
                    isHost ? "cursor-pointer" : "cursor-default"
                  } ${
                    isSelected
                      ? "bg-slate-900 border-purple-500 shadow-xl shadow-purple-500/20 ring-2 ring-purple-500/40"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center text-white shadow-md`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      {game.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-black">
                          {game.badge}
                        </span>
                      )}
                      {isSelected && !game.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                          Selected
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-white text-sm mb-1">{game.name}</h4>
                    <p className="text-xs text-slate-400 flex-1 leading-snug">{game.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category 2: Creative & Casual */}
        <div>
          <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2.5 flex items-center gap-2">
            <Palette className="w-4 h-4 text-indigo-400" />
            <span>🎨 Creative, Drawing & Casual Party Games</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {AVAILABLE_GAMES.filter((g) => g.category === "creative").map((game) => {
              const isSelected = roomState.selectedGameId === game.id;
              const Icon = game.icon;

              return (
                <div
                  key={game.id}
                  onClick={() => isHost && onSelectGame(game.id)}
                  className={`relative p-3.5 rounded-3xl border transition-all ${
                    isHost ? "cursor-pointer" : "cursor-default"
                  } ${
                    isSelected
                      ? "bg-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-500/40"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center text-white shadow-md`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      {game.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-black">
                          {game.badge}
                        </span>
                      )}
                      {isSelected && !game.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                          Selected
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-white text-sm mb-1">{game.name}</h4>
                    <p className="text-xs text-slate-400 flex-1 leading-snug">{game.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Game Rules & Options (Host can customize timers, word choices, hints, and custom words!) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Rules & Settings for{" "}
              {AVAILABLE_GAMES.find((g) => g.id === roomState.selectedGameId)?.name || "Selected Game"}
            </span>
          </div>
          {!isHost && <span className="text-[11px] text-slate-500 font-medium">Controlled by leader</span>}
        </div>

        {/* --- SETTINGS FOR DOODLE DASH & DUO DUEL --- */}
        {(roomState.selectedGameId === "skribbl" || roomState.selectedGameId === "skribbl_duel") && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Timer */}
              <div>
                <span className="text-xs text-slate-400 font-semibold block mb-1">
                  {roomState.selectedGameId === "skribbl_duel" ? "Duel Timer" : "Draw Timer"}
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {(roomState.selectedGameId === "skribbl_duel" ? [30, 45, 60, 90] : [45, 60, 75, 90, 120, 150, 180, 240]).map(
                    (sec) => (
                      <button
                        key={sec}
                        disabled={!isHost}
                        onClick={() =>
                          onUpdateSettings(
                            roomState.selectedGameId === "skribbl_duel"
                              ? { duelTime: sec }
                              : { roundTime: sec }
                          )
                        }
                        className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                          (roomState.selectedGameId === "skribbl_duel"
                            ? (roomState.settings.duelTime || 60) === sec
                            : (roomState.settings.roundTime || 75) === sec)
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                            : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {sec}s
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Rounds */}
              <div>
                <span className="text-xs text-slate-400 font-semibold block mb-1">Total Rounds</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {[1, 2, 3, 5].map((rnd) => (
                    <button
                      key={rnd}
                      disabled={!isHost}
                      onClick={() => onUpdateSettings({ totalRounds: rnd })}
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                        (roomState.settings.totalRounds || 3) === rnd
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {rnd}
                    </button>
                  ))}
                </div>
              </div>

              {/* Word Choice Count */}
              <div>
                <span className="text-xs text-slate-400 font-semibold block mb-1">Word Choices</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {[2, 3, 4, 5].map((cnt) => (
                    <button
                      key={cnt}
                      disabled={!isHost}
                      onClick={() => onUpdateSettings({ doodleWordCount: cnt })}
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                        (roomState.settings.doodleWordCount || 3) === cnt
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {cnt} words
                    </button>
                  ))}
                </div>
              </div>

              {/* Hint Count */}
              <div>
                <span className="text-xs text-slate-400 font-semibold block mb-1">Max Hints</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {[0, 1, 2, 3].map((h) => (
                    <button
                      key={h}
                      disabled={!isHost}
                      onClick={() => onUpdateSettings({ doodleHintCount: h })}
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                        (roomState.settings.doodleHintCount ?? 2) === h
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {h} hints
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Words */}
            <div>
              <span className="text-xs text-slate-400 font-semibold block mb-1">
                Custom Words Pool (Optional, comma-separated):
              </span>
              <input
                type="text"
                disabled={!isHost}
                placeholder="e.g. Hogwarts, Pikachu, Pineapple Pizza, Iron Man (comma separated)"
                value={roomState.settings.doodleCustomWords || ""}
                onChange={(e) => onUpdateSettings({ doodleCustomWords: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 disabled:opacity-50 mb-2"
              />

              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    disabled={!isHost}
                    checked={roomState.settings.doodleAllowCustomInput !== false}
                    onChange={(e) => onUpdateSettings({ doodleAllowCustomInput: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                  />
                  <span>Allow drawers to type their own custom word</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    disabled={!isHost}
                    checked={roomState.settings.doodleCustomOnly === true}
                    onChange={(e) => onUpdateSettings({ doodleCustomOnly: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                  />
                  <span>Use custom pool only (no default words)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* --- SETTINGS FOR TELEPHONE TALE (GARTIC) --- */}
        {roomState.selectedGameId === "gartic" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Writing Timer */}
            <div>
              <span className="text-xs text-slate-400 font-semibold block mb-1">✍️ Writing Time</span>
              <div className="flex items-center gap-1 flex-wrap">
                {[30, 45, 60].map((sec) => (
                  <button
                    key={sec}
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ garticWriteTime: sec })}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                      (roomState.settings.garticWriteTime || 45) === sec
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            {/* Drawing Timer */}
            <div>
              <span className="text-xs text-slate-400 font-semibold block mb-1">🎨 Drawing Time</span>
              <div className="flex items-center gap-1 flex-wrap">
                {[45, 60, 75, 90, 120].map((sec) => (
                  <button
                    key={sec}
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ garticDrawTime: sec })}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                      (roomState.settings.garticDrawTime || 75) === sec
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            {/* Guessing Timer */}
            <div>
              <span className="text-xs text-slate-400 font-semibold block mb-1">🔍 Guessing Time</span>
              <div className="flex items-center gap-1 flex-wrap">
                {[15, 20, 30, 45].map((sec) => (
                  <button
                    key={sec}
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ garticGuessTime: sec })}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                      (roomState.settings.garticGuessTime || 30) === sec
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            {/* Total Turns */}
            <div>
              <span className="text-xs text-slate-400 font-semibold block mb-1">Chain Turns</span>
              <div className="flex items-center gap-1 flex-wrap">
                {[2, 3, 4, 6].map((rnd) => (
                  <button
                    key={rnd}
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ totalRounds: rnd })}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                      (roomState.settings.totalRounds || 3) === rnd
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {rnd} turns
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- SETTINGS FOR SILHOUETTE SHOWDOWN --- */}
        {roomState.selectedGameId === "mystery_reveal" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-slate-400 font-semibold block mb-1.5">🎨 Preparation Time</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[45, 60, 90, 120, 180, 240].map((sec) => (
                  <button
                    key={sec}
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ shadowPrepTime: sec })}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                      (roomState.settings.shadowPrepTime || 120) === sec
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                        : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-semibold block mb-1.5">🔍 Guessing Time</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[30, 45, 60, 75, 90, 120].map((sec) => (
                  <button
                    key={sec}
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ shadowGuessTime: sec })}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                      (roomState.settings.shadowGuessTime || 75) === sec
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                        : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-semibold block mb-1.5">Total Rounds</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[1, 2, 3, 5, 7, 10].map((rnd) => (
                  <button
                    key={rnd}
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ totalRounds: rnd })}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                      (roomState.settings.totalRounds || 3) === rnd
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                        : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {rnd} {rnd === 1 ? "Round" : "Rounds"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- SETTINGS FOR WORD WHEEL --- */}
        {roomState.selectedGameId === "word_fortune" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-slate-400 font-semibold block mb-1.5">Round Timer</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[45, 60, 75, 90, 120, 150, 180, 240].map((sec) => (
                  <button
                    key={sec}
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ roundTime: sec })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                      (roomState.settings.roundTime || 75) === sec
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-semibold block mb-1.5">Total Rounds</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[1, 2, 3, 5, 7, 10].map((rnd) => (
                  <button
                    key={rnd}
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ totalRounds: rnd })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                      (roomState.settings.totalRounds || 3) === rnd
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {rnd} {rnd === 1 ? "Round" : "Rounds"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- SETTINGS FOR WORD IMPOSTER --- */}
        {roomState.selectedGameId === "word_imposter" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-slate-400 font-semibold block mb-1.5">🗣️ Clue Rounds Before Vote</span>
              <p className="text-[10px] text-slate-500 mb-2">How many rounds everyone gives clues before the imposter vote.</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ imposterClueRounds: n })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                      (roomState.settings.imposterClueRounds ?? 3) === n
                        ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                        : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {n} {n === 1 ? "Round" : "Rounds"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-semibold block mb-1.5">🔄 Total Game Rounds</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[1, 2, 3, 5].map((rnd) => (
                  <button
                    key={rnd}
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ totalRounds: rnd })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                      (roomState.settings.totalRounds || 3) === rnd
                        ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                        : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {rnd} {rnd === 1 ? "Round" : "Rounds"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- SETTINGS FOR MASTERMIND PROTOCOL --- */}
        {roomState.selectedGameId === "mastermind" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-slate-400 font-semibold block mb-1.5">⚡ Mini-game Time</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[30, 45, 60, 90].map((sec) => (
                  <button
                    key={sec}
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ mastermindMiniGameTime: sec })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                      (roomState.settings.mastermindMiniGameTime || 60) === sec
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                        : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-semibold block mb-1.5">🌙 Covert Operation Window</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[15, 20, 30].map((sec) => (
                  <button
                    key={sec}
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ mastermindAbilityTime: sec })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                      (roomState.settings.mastermindAbilityTime || 20) === sec
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                        : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-semibold block mb-1.5">🔄 Total Protocol Rounds</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[3, 5, 7, 10].map((rnd) => (
                  <button
                    key={rnd}
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ totalRounds: rnd })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                      (roomState.settings.totalRounds || 5) === rnd
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                        : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {rnd} Rounds
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- SETTINGS FOR CROREPATI QUIZ (KBC) --- */}
        {roomState.selectedGameId === "quiz_kbc" && (
          <div className="flex flex-col gap-3">
            {/* Category selection */}
            <div>
              <span className="text-xs text-slate-400 font-semibold block mb-1.5">
                📚 Quiz Topic / Category:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: "All", label: "🌟 All Topics" },
                  { id: "Geography", label: "🌍 Geography" },
                  { id: "Science", label: "🔬 Science & Tech" },
                  { id: "History", label: "📚 History" },
                  { id: "Math", label: "📐 Math" },
                  { id: "Sports", label: "⚽ Sports" },
                  { id: "Art", label: "🎨 Art & Music" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ quizCategory: cat.id })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      (roomState.settings.quizCategory || "All") === cat.id
                        ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30 scale-105"
                        : "bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty curve */}
            <div>
              <span className="text-xs text-slate-400 font-semibold block mb-1.5">
                📈 Difficulty Curve:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: "progressive", label: "🪜 Progressive (5 Easy → 5 Med → 5 Hard)" },
                  { id: "easy", label: "🟢 Casual (All Easy)" },
                  { id: "medium", label: "🟡 Standard (All Medium)" },
                  { id: "hard", label: "🔴 Genius (All Hard)" },
                  { id: "mixed", label: "🎲 Mixed Bag" },
                ].map((diff) => (
                  <button
                    key={diff.id}
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ quizDifficulty: diff.id as any })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      (roomState.settings.quizDifficulty || "progressive") === diff.id
                        ? "bg-yellow-400 text-slate-950 font-black shadow-md shadow-yellow-500/30"
                        : "bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
                    }`}
                  >
                    {diff.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connected Players Grid */}
      <div className="flex-1">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <span>Party Members ({players.length})</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {players.map((p) => (
            <div
              key={p.id}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                p.id === myId
                  ? "bg-indigo-950/40 border-indigo-500/40"
                  : "bg-slate-900 border-slate-800"
              }`}
            >
              <div className="relative mb-1">
                <span className="text-2xl">{p.avatar}</span>
                {p.isHost && (
                  <Crown className="w-3.5 h-3.5 text-amber-400 absolute -top-1 -right-1.5 drop-shadow" />
                )}
              </div>
              <span className="font-bold text-xs text-white truncate max-w-[110px]">
                {p.name} {p.id === myId ? "(You)" : ""}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {p.isHost ? "Leader" : "Friend"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Edit Modal */}
      <ProfileModal
        initialName={me?.name || ""}
        initialAvatar={me?.avatar || "🎨"}
        isOpen={showProfileModal}
        onSave={(newName, newAvatar) => {
          onUpdateProfile(newName, newAvatar);
          setShowProfileModal(false);
        }}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
}
