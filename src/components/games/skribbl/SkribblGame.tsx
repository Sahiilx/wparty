"use client";

import React, { useEffect, useState } from "react";
import { Clock, Trophy, Crown, ArrowLeft, Swords, Sparkles, Send } from "lucide-react";
import confetti from "canvas-confetti";
import { RoomState, DrawCommand } from "../../../../party/types";
import { DrawingCanvas } from "./DrawingCanvas";

interface SkribblGameProps {
  roomState: RoomState;
  myId: string;
  onChooseWord: (word: string) => void;
  onDrawCommand: (cmd: DrawCommand) => void;
  registerDrawHandler: (handler: (cmd: DrawCommand) => void) => void;
  onReturnToLobby: () => void;
  onSendGuess?: (text: string, targetBoard?: "1" | "2") => void;
}

export function SkribblGame({
  roomState,
  myId,
  onChooseWord,
  onDrawCommand,
  registerDrawHandler,
  onReturnToLobby,
  onSendGuess,
}: SkribblGameProps) {
  const skribbl = roomState.skribblState;
  if (!skribbl) return null;

  const isDuel = skribbl.mode === "duel";
  const isHost = roomState.hostId === myId;

  // Drawer identities
  const isDrawer1 = isDuel ? skribbl.drawer1Id === myId : skribbl.currentDrawerId === myId;
  const isDrawer2 = isDuel && skribbl.drawer2Id === myId;
  const isAnyDrawer = isDrawer1 || isDrawer2;

  const drawer1 = isDuel
    ? roomState.players[skribbl.drawer1Id || ""]
    : roomState.players[skribbl.currentDrawerId];
  const drawer2 = isDuel ? roomState.players[skribbl.drawer2Id || ""] : null;
  const duelWinner = skribbl.duelWinnerId ? roomState.players[skribbl.duelWinnerId] : null;

  // Duel separate board guessing states for audience
  const [board1Guess, setBoard1Guess] = useState("");
  const [board2Guess, setBoard2Guess] = useState("");
  const [customWordInput, setCustomWordInput] = useState("");
  const [rouletteIndex, setRouletteIndex] = useState(0);

  // Roulette flasher when duelists pick different words
  useEffect(() => {
    if (!skribbl.duelDecidingWords) return;
    const interval = setInterval(() => {
      setRouletteIndex((prev) => (prev === 0 ? 1 : 0));
    }, 140);
    return () => clearInterval(interval);
  }, [skribbl.duelDecidingWords]);

  const handleGuessBoard1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!board1Guess.trim()) return;
    onSendGuess?.(board1Guess.trim(), "1");
    setBoard1Guess("");
  };

  const handleGuessBoard2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!board2Guess.trim()) return;
    onSendGuess?.(board2Guess.trim(), "2");
    setBoard2Guess("");
  };

  // Trigger confetti on game over
  useEffect(() => {
    if (skribbl.phase === "game_over") {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }, [skribbl.phase]);

  const sortedPlayers = Object.values(roomState.players)
    .filter((p) => p.isConnected)
    .sort((a, b) => b.score - a.score);

  return (
    <div className="relative flex flex-col h-full w-full gap-2.5">
      {/* Top Game Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-lg">
        {/* Left: Round & Mode */}
        <div className="flex items-center gap-2">
          {isDuel ? (
            <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5" />
              <span>DUO DUEL</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-xs font-bold text-slate-300">
              Round {skribbl.currentRound} / {skribbl.totalRounds}
            </span>
          )}

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            {isDuel ? (
              <span>
                <strong className="text-rose-400">{drawer1?.name}</strong> vs{" "}
                <strong className="text-sky-400">{drawer2?.name}</strong>
              </span>
            ) : (
              <span>
                Drawer: <strong className="text-white">{drawer1?.name}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Center: Secret / Masked Word */}
        <div className="text-center">
          {isAnyDrawer && skribbl.secretWord ? (
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                Draw this word now
              </span>
              <span className="text-base md:text-xl font-black text-white tracking-wider uppercase bg-emerald-500/20 border border-emerald-500/30 px-3 py-0.5 rounded-xl">
                {skribbl.secretWord}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                {isDuel ? "Audience: Guess who's drawing it!" : "Guess the word"}
              </span>
              <div className="flex items-center justify-center gap-2.5 flex-wrap">
                {skribbl.revealedWord && skribbl.revealedWord !== "Choosing word..." ? (
                  <>
                    <div className="flex items-center gap-3">
                      {skribbl.revealedWord.trim().split(/\s{2,}/).map((w, idx) => (
                        <span
                          key={idx}
                          className="font-mono font-black text-white text-base md:text-xl tracking-widest bg-slate-950/60 px-2 py-0.5 rounded-lg border border-slate-800"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700">
                      ({skribbl.revealedWord.trim().split(/\s{2,}/).map((w) => w.split(/\s+/).filter(Boolean).length).join(", ")})
                    </span>
                  </>
                ) : (
                  <span className="text-base md:text-xl font-mono font-black text-white tracking-widest">
                    {skribbl.revealedWord || "Choosing word..."}
                  </span>
                )}
              </div>
            </div>
          )}
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
            <Clock
              className={`w-4 h-4 ${
                skribbl.timer <= 10 ? "text-rose-400 animate-pulse" : "text-amber-400"
              }`}
            />
            <span
              className={`font-mono font-bold text-base ${
                skribbl.timer <= 10 ? "text-rose-400" : "text-white"
              }`}
            >
              {skribbl.timer}s
            </span>
          </div>
        </div>
      </div>

      {/* Main Drawing Arena */}
      <div className="relative flex-1 min-h-[360px] overflow-hidden">
        {isDuel ? (
          isDrawer1 ? (
            /* DRAWER 1 (RED) SEES ONLY THEIR OWN CANVAS (FULL SIZE) */
            <div className="h-full flex flex-col">
              <DrawingCanvas
                canvasId="1"
                label={`🔴 You are Red Duelist (${drawer1?.name || "Player 1"})`}
                badge="Your Duel Canvas"
                badgeColor="bg-rose-500/20 text-rose-300 border-rose-500/40"
                isDrawer={skribbl.phase === "drawing"}
                onDrawCommand={onDrawCommand}
                registerDrawHandler={registerDrawHandler}
                canvasHistory={skribbl.canvasHistory}
              />
            </div>
          ) : isDrawer2 ? (
            /* DRAWER 2 (BLUE) SEES ONLY THEIR OWN CANVAS (FULL SIZE) */
            <div className="h-full flex flex-col">
              <DrawingCanvas
                canvasId="2"
                label={`🔵 You are Blue Duelist (${drawer2?.name || "Player 2"})`}
                badge="Your Duel Canvas"
                badgeColor="bg-sky-500/20 text-sky-300 border-sky-500/40"
                isDrawer={skribbl.phase === "drawing"}
                onDrawCommand={onDrawCommand}
                registerDrawHandler={registerDrawHandler}
                canvasHistory={skribbl.canvasHistory2}
              />
            </div>
          ) : (
            /* AUDIENCE SEES BOTH CANVASES + SEPARATE GUESS SPACES */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full w-full">
              {/* Board 1: Red Corner */}
              <div className="h-full flex flex-col gap-2">
                <div className="flex-1 min-h-0">
                  <DrawingCanvas
                    canvasId="1"
                    label={`🔴 ${drawer1?.name || "Player 1"} (Red Duelist)`}
                    badge="Red Board"
                    badgeColor="bg-rose-500/20 text-rose-300 border-rose-500/40"
                    isDrawer={false}
                    canvasHistory={skribbl.canvasHistory}
                  />
                </div>
                {/* Board 1 Guess Box */}
                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-2 shadow-md">
                  {skribbl.board1Guessed ? (
                    <div className="w-full py-2 px-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                      <span>✓ Red Board Solved! (+200 pts)</span>
                    </div>
                  ) : (
                    <form onSubmit={handleGuessBoard1} className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        placeholder={`Guess Red's drawing (${drawer1?.name || "P1"})...`}
                        value={board1Guess}
                        onChange={(e) => setBoard1Guess(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-rose-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
                      />
                      <button
                        type="submit"
                        disabled={!board1Guess.trim()}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs whitespace-nowrap shadow-md shadow-rose-600/20 flex items-center gap-1 transition-all"
                      >
                        <Send className="w-3 h-3" />
                        <span>Guess 🔴</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Board 2: Blue Corner */}
              <div className="h-full flex flex-col gap-2">
                <div className="flex-1 min-h-0">
                  <DrawingCanvas
                    canvasId="2"
                    label={`🔵 ${drawer2?.name || "Player 2"} (Blue Duelist)`}
                    badge="Blue Board"
                    badgeColor="bg-sky-500/20 text-sky-300 border-sky-500/40"
                    isDrawer={false}
                    canvasHistory={skribbl.canvasHistory2}
                  />
                </div>
                {/* Board 2 Guess Box */}
                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-2 shadow-md">
                  {skribbl.board2Guessed ? (
                    <div className="w-full py-2 px-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                      <span>✓ Blue Board Solved! (+200 pts)</span>
                    </div>
                  ) : (
                    <form onSubmit={handleGuessBoard2} className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        placeholder={`Guess Blue's drawing (${drawer2?.name || "P2"})...`}
                        value={board2Guess}
                        onChange={(e) => setBoard2Guess(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-sky-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                      />
                      <button
                        type="submit"
                        disabled={!board2Guess.trim()}
                        className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs whitespace-nowrap shadow-md shadow-sky-600/20 flex items-center gap-1 transition-all"
                      >
                        <Send className="w-3 h-3" />
                        <span>Guess 🔵</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )
        ) : (
          /* CLASSIC SINGLE CANVAS */
          <DrawingCanvas
            canvasId="1"
            isDrawer={isDrawer1 && skribbl.phase === "drawing"}
            onDrawCommand={onDrawCommand}
            registerDrawHandler={registerDrawHandler}
            canvasHistory={skribbl.canvasHistory}
          />
        )}

        {/* Modal: Word Selection */}
        {skribbl.phase === "word_select" && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-20">
            {skribbl.duelDecidingWords ? (
              /* Split vote coin-flip / roulette animation */
              <div className="flex flex-col items-center justify-center p-6 text-center animate-fade-in max-w-md w-full">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl mb-3 animate-bounce">
                  🎲
                </div>
                <span className="text-xs font-black uppercase text-amber-400 tracking-widest mb-1">
                  Split Vote! Deciding Word...
                </span>
                <p className="text-xs text-slate-400 mb-4">
                  Both duelists picked different words! Choosing randomly:
                </p>

                <div className="text-3xl md:text-4xl font-black text-yellow-300 uppercase tracking-widest my-2 px-8 py-4 rounded-3xl bg-slate-900 border-2 border-yellow-500/60 shadow-[0_0_35px_rgba(234,179,8,0.3)] transition-all scale-105">
                  {skribbl.duelDecidingWords[rouletteIndex]}
                </div>

                <div className="flex items-center justify-center gap-4 text-xs font-bold mt-4">
                  <span className={`px-3 py-1 rounded-xl border ${rouletteIndex === 0 ? "bg-rose-500/20 border-rose-500 text-rose-300 scale-105" : "border-slate-800 text-slate-500"}`}>
                    🔴 Red: {skribbl.duelDecidingWords[0]}
                  </span>
                  <span className="text-slate-600 font-mono">VS</span>
                  <span className={`px-3 py-1 rounded-xl border ${rouletteIndex === 1 ? "bg-sky-500/20 border-sky-500 text-sky-300 scale-105" : "border-slate-800 text-slate-500"}`}>
                    🔵 Blue: {skribbl.duelDecidingWords[1]}
                  </span>
                </div>
              </div>
            ) : (isDuel ? (isDrawer1 || isDrawer2) : isDrawer1) ? (
              <>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold mb-3">
                  <Sparkles className="w-4 h-4" />
                  <span>{isDuel ? "Vote for Duel Word!" : "Choose Word to Draw!"}</span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white mb-2">
                  {isDuel ? "Vote for the Duel Word!" : "Choose a Secret Word!"}
                </h2>
                <p className="text-xs text-slate-400 mb-4 text-center">
                  {isDuel
                    ? "Both duelists vote! Pick the same word to start instantly, or a coin flip will decide:"
                    : "Pick one word you want to draw:"}
                </p>

                {/* Live Duel Votes Display */}
                {isDuel && (
                  <div className="mb-4 flex items-center justify-center gap-3 text-xs flex-wrap">
                    <span className={`px-3 py-1 rounded-xl border font-bold ${skribbl.drawer1Vote ? "bg-rose-950/60 border-rose-500 text-rose-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}>
                      🔴 Red ({drawer1?.name || "P1"}): {skribbl.drawer1Vote ? `✓ Voted (${skribbl.drawer1Vote.toUpperCase()})` : "⏳ Voting..."}
                    </span>
                    <span className={`px-3 py-1 rounded-xl border font-bold ${skribbl.drawer2Vote ? "bg-sky-950/60 border-sky-500 text-sky-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}>
                      🔵 Blue ({drawer2?.name || "P2"}): {skribbl.drawer2Vote ? `✓ Voted (${skribbl.drawer2Vote.toUpperCase()})` : "⏳ Voting..."}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-md">
                  {skribbl.wordChoices.map((w) => {
                    const myVote = isDrawer1 ? skribbl.drawer1Vote : skribbl.drawer2Vote;
                    const isSelected = myVote === w.toLowerCase();
                    return (
                      <button
                        key={w}
                        onClick={() => onChooseWord(w)}
                        className={`py-4 px-3 font-bold rounded-2xl shadow-xl uppercase tracking-wider text-sm transition-all hover:scale-105 active:scale-95 ${
                          isSelected
                            ? "bg-amber-500 text-slate-950 font-black ring-2 ring-yellow-300 scale-105 shadow-amber-500/30"
                            : "bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-indigo-600/20"
                        }`}
                      >
                        {w}
                        {isSelected && <span className="block text-[10px] font-normal mt-0.5">✓ Your Vote</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Optional Custom Word Input */}
                {roomState.settings.doodleAllowCustomInput !== false && (
                  <div className="mt-5 pt-4 border-t border-slate-800 w-full max-w-md text-center">
                    <span className="text-xs font-bold text-slate-400 block mb-2">
                      ✏️ Or vote for your own custom word:
                    </span>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (customWordInput.trim()) {
                          onChooseWord(customWordInput.trim().toUpperCase());
                          setCustomWordInput("");
                        }
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={customWordInput}
                        onChange={(e) => setCustomWordInput(e.target.value)}
                        placeholder="Type any custom word..."
                        maxLength={30}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs uppercase placeholder:normal-case placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={!customWordInput.trim()}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase transition-all shadow"
                      >
                        Vote Word
                      </button>
                    </form>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-2xl mb-3 animate-bounce">
                  {drawer1?.avatar || "🎨"}
                </div>
                <h2 className="text-lg font-bold text-white mb-1">
                  {isDuel ? "Duelists are voting on the word..." : `${drawer1?.name || "Drawer"} is selecting a word...`}
                </h2>
                <p className="text-xs text-slate-400">
                  {isDuel
                    ? "Both duelists are voting! Match will start as soon as words are locked in."
                    : "Get ready to guess!"}
                </p>

                {isDuel && (
                  <div className="mt-4 flex items-center justify-center gap-3 text-xs">
                    <span className={`px-3 py-1 rounded-xl border font-bold ${skribbl.drawer1Vote ? "bg-rose-950/60 border-rose-500 text-rose-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}>
                      🔴 Red ({drawer1?.name || "P1"}): {skribbl.drawer1Vote ? "✓ Voted" : "⏳ Choosing..."}
                    </span>
                    <span className={`px-3 py-1 rounded-xl border font-bold ${skribbl.drawer2Vote ? "bg-sky-950/60 border-sky-500 text-sky-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}>
                      🔵 Blue ({drawer2?.name || "P2"}): {skribbl.drawer2Vote ? "✓ Voted" : "⏳ Choosing..."}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal: Round Recap */}
        {skribbl.phase === "round_recap" && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-20 animate-fade-in">
            <span className="text-xs uppercase font-bold text-amber-400 tracking-widest mb-1">
              Round Complete!
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
              The word was: <span className="text-indigo-400 uppercase">{skribbl.secretWord}</span>
            </h2>

            {isDuel && duelWinner && (
              <div className="mb-4 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500/20 to-indigo-500/20 border border-amber-500/40 text-amber-300 text-sm font-bold flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Duel Champion: {duelWinner.name} (+150 bonus pts)!</span>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-full max-w-sm">
              <span className="text-xs font-semibold text-slate-400 block mb-2">
                Audience members who guessed ({skribbl.guessedPlayerIds.length}):
              </span>
              <div className="flex flex-wrap gap-2">
                {skribbl.guessedPlayerIds.map((pid) => (
                  <span
                    key={pid}
                    className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-medium"
                  >
                    ✓ {roomState.players[pid]?.name || "Player"}
                  </span>
                ))}
                {skribbl.guessedPlayerIds.length === 0 && (
                  <span className="text-xs text-slate-500 italic">No one guessed in time!</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Game Over / Podium */}
        {skribbl.phase === "game_over" && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg rounded-2xl flex flex-col items-center justify-center p-6 z-30">
            <Trophy className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
            <h2 className="text-3xl font-black text-white mb-6">Game Over!</h2>

            <div className="flex items-end justify-center gap-3 w-full max-w-sm mb-8">
              {sortedPlayers[1] && (
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center flex flex-col items-center">
                  <span className="text-xl mb-1">{sortedPlayers[1].avatar}</span>
                  <span className="text-xs font-bold text-slate-300 truncate w-full">
                    {sortedPlayers[1].name}
                  </span>
                  <span className="text-xs text-indigo-400 font-bold">{sortedPlayers[1].score} pts</span>
                  <span className="mt-2 px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400 font-black">
                    #2
                  </span>
                </div>
              )}

              {sortedPlayers[0] && (
                <div className="flex-1 bg-gradient-to-b from-indigo-950 to-slate-900 border-2 border-amber-400/60 rounded-2xl p-4 text-center flex flex-col items-center shadow-xl shadow-amber-500/10 -translate-y-2">
                  <Crown className="w-5 h-5 text-amber-400 mb-1" />
                  <span className="text-2xl mb-1">{sortedPlayers[0].avatar}</span>
                  <span className="text-xs font-black text-white truncate w-full">
                    {sortedPlayers[0].name}
                  </span>
                  <span className="text-xs text-amber-300 font-bold">{sortedPlayers[0].score} pts</span>
                  <span className="mt-2 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black">
                    WINNER
                  </span>
                </div>
              )}

              {sortedPlayers[2] && (
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center flex flex-col items-center">
                  <span className="text-xl mb-1">{sortedPlayers[2].avatar}</span>
                  <span className="text-xs font-bold text-slate-300 truncate w-full">
                    {sortedPlayers[2].name}
                  </span>
                  <span className="text-xs text-indigo-400 font-bold">{sortedPlayers[2].score} pts</span>
                  <span className="mt-2 px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400 font-black">
                    #3
                  </span>
                </div>
              )}
            </div>

            {isHost && (
              <button
                onClick={onReturnToLobby}
                className="py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Party Lobby</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
