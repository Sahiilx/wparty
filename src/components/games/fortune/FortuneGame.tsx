"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Clock, Trophy, Crown, ArrowLeft, Sparkles, HelpCircle, CheckCircle2, RefreshCw } from "lucide-react";
import confetti from "canvas-confetti";
import { RoomState } from "../../../../party/types";
import { MASSIVE_PHRASES, PhraseEntry } from "../../../../party/words/massive-phrases";

interface FortuneGameProps {
  roomState: RoomState;
  myId: string;
  onSetPhrase: (phrase: string, category: string) => void;
  onGuessLetter: (letter: string) => void;
  onReturnToLobby: () => void;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function FortuneGame({
  roomState,
  myId,
  onSetPhrase,
  onGuessLetter,
  onReturnToLobby,
}: FortuneGameProps) {
  const fortune = roomState.fortuneState;
  if (!fortune) return null;

  const isCreator = fortune.puzzleCreatorId === myId;
  const isHost = roomState.hostId === myId;
  const creator = roomState.players[fortune.puzzleCreatorId];
  const solver = fortune.solvedByPlayerId ? roomState.players[fortune.solvedByPlayerId] : null;

  const [customPhrase, setCustomPhrase] = useState("");
  const [customCategory, setCustomCategory] = useState("Movies");
  const [selectedLang, setSelectedLang] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [suggestionSeed, setSuggestionSeed] = useState<number>(0);

  // Dynamic multilingual suggestions
  const filteredSuggestions = useMemo(() => {
    let list = MASSIVE_PHRASES;
    if (selectedLang !== "All") {
      list = list.filter((p) => (p.language || "English").toLowerCase() === selectedLang.toLowerCase());
    }
    if (selectedCategory !== "All") {
      list = list.filter((p) => p.category.toLowerCase().includes(selectedCategory.toLowerCase()));
    }
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  }, [selectedLang, selectedCategory, suggestionSeed]);

  // Confetti on solve / game over
  useEffect(() => {
    if (fortune.phase === "round_recap" && fortune.solvedByPlayerId) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    if (fortune.phase === "game_over") {
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }
  }, [fortune.phase, fortune.solvedByPlayerId]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPhrase.trim()) return;
    onSetPhrase(customPhrase.trim(), customCategory.trim());
  };

  // Split revealed phrase into words for clean board layout
  const phraseWords = (fortune.revealedPhrase || "").split("   ");

  const sortedPlayers = Object.values(roomState.players)
    .filter((p) => p.isConnected)
    .sort((a, b) => b.score - a.score);

  return (
    <div className="relative flex flex-col h-full w-full gap-3 overflow-y-auto">
      {/* Top Game Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black">
            🎡 WORD FORTUNE
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Host: <strong className="text-white">{creator?.name}</strong>
          </span>
        </div>

        {/* Category Pill */}
        <div className="px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-bold text-indigo-300">
          Category: <span className="text-white font-extrabold uppercase">{fortune.category}</span>
        </div>

        {/* Right: End Game (Host) & Timer */}
        <div className="flex items-center gap-2">
          {isHost && (
            <button
              onClick={onReturnToLobby}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all"
              title="End game and return to lobby"
            >
              End Game
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <Clock className={`w-4 h-4 ${fortune.timer <= 10 ? "text-rose-400 animate-pulse" : "text-amber-400"}`} />
            <span className={`font-mono font-bold text-base ${fortune.timer <= 10 ? "text-rose-400" : "text-white"}`}>
              {fortune.timer}s
            </span>
          </div>
        </div>
      </div>

      {/* Main Wheel of Fortune Tile Board */}
      <div className="relative flex-1 min-h-[300px] bg-gradient-to-b from-emerald-950/80 via-slate-900 to-slate-950 border-4 border-emerald-600/40 rounded-3xl p-6 flex flex-col items-center justify-center shadow-2xl overflow-hidden">
        {/* Background Casino Glow */}
        <div className="absolute inset-0 bg-radial-gradient from-emerald-500/10 to-transparent pointer-events-none" />

        {/* Tiles Board */}
        <div className="flex flex-wrap items-center justify-center gap-y-4 gap-x-6 max-w-3xl z-10">
          {phraseWords.map((word, wIdx) => {
            const letters = word.split(" ");
            return (
              <div key={wIdx} className="flex items-center gap-1.5 bg-emerald-900/40 p-2 rounded-2xl border border-emerald-500/30 shadow-inner">
                {letters.map((char, lIdx) => {
                  const isBlank = char === "_";
                  return (
                    <div
                      key={lIdx}
                      className={`w-9 h-12 md:w-11 md:h-14 rounded-xl flex items-center justify-center font-mono font-black text-xl md:text-2xl shadow-lg transition-all ${
                        isBlank
                          ? "bg-slate-950/80 border-2 border-emerald-500/40 text-transparent"
                          : "bg-white text-slate-950 border-2 border-amber-400 scale-105 shadow-amber-400/20"
                      }`}
                    >
                      {char}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Solve Hint */}
        <div className="mt-6 z-10 px-4 py-1.5 rounded-full bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>Know the answer? <strong>Type the full phrase in the live chat</strong> to solve anytime!</span>
        </div>

        {/* Creator Notice */}
        {isCreator && fortune.phase === "guessing" && (
          <div className="mt-2 text-xs font-semibold text-emerald-400 flex items-center justify-center gap-2 flex-wrap">
            <span>You created this puzzle:</span>
            <span className="font-black uppercase tracking-wider text-white bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 rounded-lg">
              {fortune.secretPhrase || "Secret Puzzle"}
            </span>
          </div>
        )}
      </div>

      {/* Letter Keyboard (A-Z) - Strictly Turn-Based */}
      {!isCreator && fortune.phase === "guessing" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg">
          {myId === fortune.currentTurnPlayerId ? (
            <>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5 animate-pulse">
                  <span>👉</span> YOUR TURN! Click ONE letter to guess (+150 pts):
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {fortune.timer}s remaining
                </span>
              </div>
              <div className="grid grid-cols-7 sm:grid-cols-9 md:grid-cols-13 gap-1.5 max-w-2xl mx-auto">
                {ALPHABET.map((letter) => {
                  const isHit = fortune.guessedLetters.includes(letter);
                  const isMiss = fortune.wrongLetters.includes(letter);
                  const isUsed = isHit || isMiss;

                  return (
                    <button
                      key={letter}
                      disabled={isUsed}
                      onClick={() => onGuessLetter(letter)}
                      className={`h-10 rounded-xl font-mono font-black text-sm transition-all ${
                        isHit
                          ? "bg-emerald-600 text-white border border-emerald-400 shadow-md shadow-emerald-500/20"
                          : isMiss
                          ? "bg-slate-950 text-slate-600 border border-slate-800 cursor-not-allowed line-through"
                          : "bg-slate-800 hover:bg-indigo-600 hover:scale-105 active:scale-95 text-white border border-slate-700 shadow-sm"
                      }`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="py-3 px-4 text-center flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm mb-1">
                <span className="animate-spin text-base">⏳</span>
                <span>
                  Waiting for {roomState.players[fortune.currentTurnPlayerId]?.name || "Player"}'s turn to pick a letter...
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {fortune.usedTurnPlayerIds.includes(myId)
                  ? "✓ You already made your letter guess for this round! You can still solve the whole phrase anytime in live chat."
                  : "Your turn will appear as soon as the current player guesses."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal: Creator Sets Phrase */}
      {fortune.phase === "phrase_select" && isCreator && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-20 overflow-y-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Puzzle Creator Turn</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white mb-1">Pick or Write a Puzzle Phrase</h2>
          <p className="text-xs text-slate-400 mb-4">Choose from multilingual suggestions or write your own custom puzzle:</p>

          {/* Filters Bar: Language + Category + Randomize Button */}
          <div className="w-full max-w-xl mb-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none"
              >
                <option value="All">🌐 All Languages</option>
                <option value="English">English</option>
                <option value="Hinglish">🇮🇳 Hinglish / Bollywood</option>
                <option value="French">🇫🇷 French</option>
                <option value="Spanish">🇪🇸 Spanish</option>
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none"
              >
                <option value="All">All Categories</option>
                <option value="Movies">🎬 Movies & Shows</option>
                <option value="Dialogues">💬 Dialogues & Quotes</option>
                <option value="Anime">🦸 Anime & Cartoons</option>
                <option value="Food">🍕 Food & Cuisine</option>
                <option value="Utensils">🥄 Utensils & Objects</option>
                <option value="Idioms">💡 Idioms & Phrases</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setSuggestionSeed((s) => s + 1)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition-all shadow"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>🎲 Refresh Suggestions</span>
            </button>
          </div>

          {/* Quick Presets Grid */}
          <div className="w-full max-w-xl mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {filteredSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onSetPhrase(item.phrase, item.category)}
                  className="p-2.5 bg-slate-900 hover:bg-indigo-600 text-left rounded-xl border border-slate-800 transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-slate-400 group-hover:text-indigo-200 uppercase truncate">
                      {item.category}
                    </span>
                    <span className="text-[8px] px-1 rounded bg-slate-800 text-amber-300 font-bold">
                      {item.language}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-white truncate block">
                    {item.phrase}
                  </span>
                  {item.hint && (
                    <span className="text-[9px] text-slate-500 group-hover:text-indigo-200 italic mt-0.5 truncate">
                      {item.hint}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Phrase Form */}
          <form onSubmit={handleCustomSubmit} className="w-full max-w-xl bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block mb-2">
              Or Write Your Own Custom Phrase
            </span>
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <input
                type="text"
                placeholder="Category (e.g. Marvel Movies)"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full sm:w-1/3 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
              <input
                type="text"
                maxLength={40}
                placeholder="Secret Phrase (e.g. AVENGERS ASSEMBLE)"
                value={customPhrase}
                onChange={(e) => setCustomPhrase(e.target.value.toUpperCase())}
                className="w-full sm:w-2/3 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={!customPhrase.trim()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all"
            >
              Lock in Custom Phrase & Start!
            </button>
          </form>
        </div>
      )}

      {/* Modal: Waiting for Creator */}
      {fortune.phase === "phrase_select" && !isCreator && (
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 z-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl mb-3 animate-spin">
            🎡
          </div>
          <h2 className="text-lg font-bold text-white mb-1">
            {creator?.name || "Player"} is preparing the word puzzle...
          </h2>
          <p className="text-xs text-slate-400">Get ready to spin & guess letters!</p>
        </div>
      )}

      {/* Modal: Round Recap */}
      {fortune.phase === "round_recap" && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-20 text-center">
          <span className="text-xs uppercase font-bold text-amber-400 tracking-widest mb-1">
            Puzzle Solved!
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
            The solution was: <span className="text-emerald-400 uppercase">{fortune.secretPhrase}</span>
          </h2>
          {solver && (
            <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-300 text-sm font-bold flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4" />
              <span>Solved by {solver.name} (+600 bonus points)!</span>
            </div>
          )}
        </div>
      )}

      {/* Modal: Game Over Podium */}
      {fortune.phase === "game_over" && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg rounded-2xl flex flex-col items-center justify-center p-6 z-30">
          <Trophy className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
          <h2 className="text-3xl font-black text-white mb-6">Game Over!</h2>

          <div className="flex items-end justify-center gap-3 w-full max-w-sm mb-8">
            {sortedPlayers[0] && (
              <div className="flex-1 bg-gradient-to-b from-indigo-950 to-slate-900 border-2 border-amber-400/60 rounded-2xl p-4 text-center flex flex-col items-center shadow-xl shadow-amber-500/10">
                <Crown className="w-5 h-5 text-amber-400 mb-1" />
                <span className="text-2xl mb-1">{sortedPlayers[0].avatar}</span>
                <span className="text-xs font-black text-white truncate w-full">{sortedPlayers[0].name}</span>
                <span className="text-xs text-amber-300 font-bold">{sortedPlayers[0].score} pts</span>
              </div>
            )}
          </div>

          {isHost && (
            <button
              onClick={onReturnToLobby}
              className="py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Party Lobby</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

