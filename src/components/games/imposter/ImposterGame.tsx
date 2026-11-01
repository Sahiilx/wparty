"use client";

import React, { useState } from "react";
import { RoomState } from "../../../../party/types";
import { Clock, Eye, Send, CheckCircle2, AlertTriangle, HelpCircle, Trophy, UserCheck } from "lucide-react";

interface ImposterGameProps {
  roomState: RoomState;
  myId: string;
  onSubmitClue: (clue: string) => void;
  onVote: (suspectId: string) => void;
  onGuessWord: (guess: string) => void;
  onReturnToLobby: () => void;
  onSkipTimer?: () => void;
}

export const ImposterGame: React.FC<ImposterGameProps> = ({
  roomState,
  myId,
  onSubmitClue,
  onVote,
  onGuessWord,
  onReturnToLobby,
  onSkipTimer,
}) => {
  const imp = roomState.imposterState;
  const isHost = roomState.hostId === myId;
  const [clueInput, setClueInput] = useState("");
  const [guessInput, setGuessInput] = useState("");
  const [votedId, setVotedId] = useState<string | null>(null);

  if (!imp) return null;

  const isImposter = imp.imposterId === myId;
  const isMyTurnToSpeak = imp.phase === "clue_giving" && imp.currentSpeakerId === myId;
  const myWord = isImposter ? imp.imposterWord : imp.secretWord;
  const players = Object.values(roomState.players).filter((p) => p.isConnected);

  const handleClueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clueInput.trim() || !isMyTurnToSpeak) return;
    onSubmitClue(clueInput.trim());
    setClueInput("");
  };

  const handleVoteSubmit = (suspectId: string) => {
    if (imp.phase !== "voting" || votedId) return;
    setVotedId(suspectId);
    onVote(suspectId);
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim() || !isImposter || imp.phase !== "imposter_guess") return;
    onGuessWord(guessInput.trim());
    setGuessInput("");
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-white p-3 md:p-6 overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-indigo-600 p-0.5 shadow-lg shadow-rose-600/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-xl">
              🕵️
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-rose-400">
                Round {imp.currentRound} of {imp.totalRounds}
                {imp.phase === "clue_giving" && imp.totalClueRounds > 1 && (
                  <span className="text-indigo-300 ml-2">· Clue Round {imp.currentClueRound ?? 1} of {imp.totalClueRounds}</span>
                )}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950/80 border border-indigo-700/50 text-indigo-300">
                Word Imposter
              </span>
            </div>
            <div className="text-sm md:text-base font-bold text-slate-300">
              {imp.phase === "clue_giving" && "Give ONE word clue about your secret word"}
              {imp.phase === "voting" && "Vote who you think is the Imposter!"}
              {imp.phase === "reveal" && "Imposter revealed!"}
              {imp.phase === "imposter_guess" && "Imposter has one chance to guess the crew's word!"}
              {imp.phase === "round_recap" && "Round recap & scores"}
            </div>
          </div>
        </div>

        {/* Controls & Timer */}
        <div className="flex items-center gap-2">
          {isHost && onSkipTimer && (
            <button
              onClick={onSkipTimer}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/30"
            >
              Skip Timer
            </button>
          )}

          {isHost && (
            <button
              onClick={onReturnToLobby}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold hover:bg-rose-500/30"
            >
              Exit
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <Clock className={`w-4 h-4 ${imp.timer <= 5 ? "text-rose-400 animate-pulse" : "text-amber-400"}`} />
            <span className={`font-mono font-bold text-base ${imp.timer <= 5 ? "text-rose-400" : "text-white"}`}>
              {imp.timer}s
            </span>
          </div>
        </div>
      </div>

      {/* Secret Word Card (Revealed only to current player) */}
      <div className="mb-4 p-4 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-800/40 shadow-xl flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-lg">
            🔒
          </div>
          <div>
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
              Your Secret Word
            </span>
            <span className="text-xl md:text-2xl font-black text-white tracking-wide">
              {myWord || "???"}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-400 block">Role</span>
          <span
            className={`text-xs font-black uppercase px-2.5 py-1 rounded-full ${isImposter
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
          >
            {isImposter ? "🔴 Imposter (Blend in!)" : "🔵 Crew Member"}
          </span>
        </div>
      </div>

      {/* Phase 1: Clue Giving */}
      {imp.phase === "clue_giving" && (
        <div className="flex-1 flex flex-col justify-between max-w-3xl mx-auto w-full">
          {/* Speaker indicator */}
          <div className="text-center my-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400 block mb-1">
              Current Speaker
            </span>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 shadow">
              <span className="text-2xl">{roomState.players[imp.currentSpeakerId]?.avatar}</span>
              <span className="font-black text-lg text-white">
                {roomState.players[imp.currentSpeakerId]?.name}
              </span>
              {isMyTurnToSpeak && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase">
                  It's Your Turn!
                </span>
              )}
            </div>
          </div>

          {/* Clues history list */}
          <div className="my-4 flex-1 bg-slate-900/60 border border-slate-800 rounded-3xl p-4 flex flex-col gap-2 overflow-y-auto max-h-[300px]">
            <span className="text-xs font-bold text-slate-400 block mb-1">Clues Given So Far:</span>
            {imp.clues.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No clues given yet...</p>
            ) : (
              imp.clues.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800/80"
                >
                  <span className="text-xs font-bold text-slate-300">{c.playerName}:</span>
                  <span className="font-mono font-black text-base text-yellow-300 uppercase tracking-wide">
                    "{c.clue}"
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Clue Input Form */}
          {isMyTurnToSpeak ? (
            <form onSubmit={handleClueSubmit} className="flex gap-2">
              <input
                type="text"
                value={clueInput}
                onChange={(e) => setClueInput(e.target.value)}
                placeholder="Type exactly ONE word clue..."
                maxLength={25}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-white font-bold placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                autoFocus
              />
              <button
                type="submit"
                disabled={!clueInput.trim()}
                className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black text-sm uppercase transition-all shadow-lg shadow-indigo-600/30"
              >
                Submit Clue
              </button>
            </form>
          ) : (
            <div className="text-center p-3 rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
              Waiting for {roomState.players[imp.currentSpeakerId]?.name} to give their clue...
            </div>
          )}
        </div>
      )}

      {/* Phase 2: Voting */}
      {imp.phase === "voting" && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-black text-white mb-1">Who is the Imposter?</h3>
            <p className="text-xs text-slate-400">
              Vote for the player whose clue seemed most suspicious.
              {players.length <= 3
                ? " (⚠️ 1 wrong guess eliminates you!)"
                : " (⚠️ 2 wrong guesses eliminates you!)"}
            </p>
          </div>

          {imp.eliminatedPlayerIds?.includes(myId) ? (
            <div className="w-full p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-bold text-center mb-4">
              ❌ You have been eliminated from voting due to wrong guesses. Spectating the vote...
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {players.map((p) => {
              const clueObj = imp.clues.find((c) => c.playerId === p.id);
              const isSelected = votedId === p.id;
              const strikes = imp.strikes?.[p.id] || 0;
              const isEliminated = imp.eliminatedPlayerIds?.includes(p.id);
              const maxStrikes = players.length <= 3 ? 1 : 2;
              const hasRedOutline = !isEliminated && maxStrikes === 2 && strikes === 1;

              return (
                <button
                  key={p.id}
                  onClick={() => handleVoteSubmit(p.id)}
                  disabled={!!votedId || !!imp.eliminatedPlayerIds?.includes(myId) || isEliminated}
                  className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left ${isSelected
                      ? "bg-rose-950/80 border-rose-500 text-white shadow-lg shadow-rose-600/30 scale-[1.02]"
                      : hasRedOutline
                        ? "bg-slate-900 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)] text-slate-200 ring-2 ring-rose-500/40"
                        : isEliminated
                          ? "bg-slate-950/40 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed"
                          : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.avatar}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm block ${isEliminated ? "line-through text-slate-500" : ""}`}>
                          {p.name}
                        </span>
                        {hasRedOutline && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-950 border border-rose-500 text-rose-300 text-[10px] font-black animate-pulse">
                            ⚠️ 1 Strike
                          </span>
                        )}
                        {isEliminated && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-black">
                            ❌ Eliminated
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-yellow-400 font-mono">
                        Clue: "{clueObj?.clue || "..."}"
                      </span>
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-rose-400" />}
                </button>
              );
            })}
          </div>

          {/* Vote None / Skip Vote Option */}
          <button
            onClick={() => handleVoteSubmit("none")}
            disabled={!!votedId || !!imp.eliminatedPlayerIds?.includes(myId)}
            className={`w-full mt-3 p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between text-left ${votedId === "none"
                ? "bg-slate-800 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/20 scale-[1.01]"
                : "bg-slate-900/90 border-slate-700/70 hover:border-slate-500 text-slate-300"
              }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚪</span>
              <div>
                <span className="font-bold text-sm block text-white">Vote None / Skip Vote</span>
                <span className="text-xs text-slate-400">
                  Abstain if uncertain — safe choice (no strike penalty)
                </span>
              </div>
            </div>
            {votedId === "none" && <CheckCircle2 className="w-5 h-5 text-amber-400" />}
          </button>

          {votedId && (
            <p className="mt-4 text-xs font-bold text-slate-400 animate-pulse">
              Vote cast! Waiting for other players...
            </p>
          )}
        </div>
      )}

      {/* Phase 3: Reveal / Imposter Guess */}
      {(imp.phase === "reveal" || imp.phase === "imposter_guess") && (
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto w-full">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-3xl mb-3 animate-bounce">
            🕵️
          </div>
          <span className="text-xs font-black uppercase text-rose-400 tracking-widest mb-1">
            Imposter Revealed!
          </span>
          <h2 className="text-3xl font-black text-white mb-2">
            {roomState.players[imp.imposterId]?.name}
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Their word was <span className="font-bold text-yellow-400">"{imp.imposterWord}"</span> vs Crew's{" "}
            <span className="font-bold text-indigo-400">"{imp.secretWord}"</span>
          </p>

          {/* Vote Reveal Breakdown (Who Voted Whom) */}
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-4 my-2 flex flex-col gap-2 shadow-xl">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-400 block text-left">
              🗳️ Vote Reveal Breakdown:
            </span>
            {Object.entries(imp.voteHistory || imp.votes || {}).map(([voterId, suspectId]) => {
              const voter = roomState.players[voterId];
              const isVoteNone = suspectId === "none";
              const suspect = isVoteNone ? null : roomState.players[suspectId];
              const isCorrect = suspectId === imp.imposterId;
              return (
                <div
                  key={voterId}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${isCorrect
                      ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                      : isVoteNone
                        ? "bg-slate-900/80 border-slate-700/80 text-slate-300"
                        : "bg-rose-950/60 border-rose-500/50 text-rose-300"
                    }`}
                >
                  <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                    <span>{voter?.avatar || "👤"}</span>
                    <span className="text-white truncate">{voter?.name || "Player"}</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[10px] px-1">➔ voted ➔</span>
                  <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                    {isVoteNone ? (
                      <>
                        <span>⚪</span>
                        <span className="text-slate-300 italic">None / Skip</span>
                      </>
                    ) : (
                      <>
                        <span>{suspect?.avatar || "👤"}</span>
                        <span className="truncate">{suspect?.name || "Suspect"}</span>
                      </>
                    )}
                  </div>
                  <span className="ml-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-950/80 shrink-0">
                    {isCorrect ? "✓ Caught!" : isVoteNone ? "⚪ Skipped" : "✗ Wrong"}
                  </span>
                </div>
              );
            })}
          </div>

          {imp.phase === "imposter_guess" && isImposter && (
            <form onSubmit={handleGuessSubmit} className="w-full flex flex-col gap-2 mt-2">
              <p className="text-xs font-bold text-yellow-400 mb-1">
                You were caught! But you can still win +50 pts if you guess the crew's word:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  placeholder="Guess crew's secret word..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-white font-bold text-sm"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!guessInput.trim()}
                  className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase"
                >
                  Guess
                </button>
              </div>
            </form>
          )}

          {imp.phase === "imposter_guess" && !isImposter && (
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 animate-pulse mt-2">
              Waiting for {roomState.players[imp.imposterId]?.name} to attempt guessing your word...
            </div>
          )}
        </div>
      )}

      {/* Phase 4: Round Recap */}
      {imp.phase === "round_recap" && (
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto w-full">
          <div className="w-16 h-16 rounded-3xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-3xl mb-3">
            🏆
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-1">
            {imp.roundWinner === "crew" ? "🔵 CREW WINS!" : "🔴 IMPOSTER WINS!"}
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Crew Word: <span className="text-indigo-400 font-bold">{imp.secretWord}</span> | Imposter Word:{" "}
            <span className="text-rose-400 font-bold">{imp.imposterWord}</span>
          </p>

          <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col gap-2">
            {players.map((p) => {
              const strikes = imp.strikes?.[p.id] || 0;
              const isEliminated = imp.eliminatedPlayerIds?.includes(p.id);
              const maxStrikes = players.length <= 3 ? 1 : 2;
              const hasRedOutline = !isEliminated && maxStrikes === 2 && strikes === 1;

              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${hasRedOutline
                      ? "bg-slate-950/80 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                      : isEliminated
                        ? "bg-slate-950/40 border-slate-800 text-slate-600 opacity-60"
                        : "bg-slate-950/60 border-slate-800 text-slate-200"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{p.avatar}</span>
                    <span className={`font-bold ${isEliminated ? "line-through" : ""}`}>{p.name}</span>
                    {hasRedOutline && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-950 border border-rose-500 text-rose-300 text-[10px] font-black">
                        ⚠️ 1 Strike
                      </span>
                    )}
                    {isEliminated && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-black">
                        ❌ Eliminated
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-yellow-400">{p.score} pts</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

