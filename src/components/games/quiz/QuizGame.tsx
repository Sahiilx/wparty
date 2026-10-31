"use client";

import React, { useState } from "react";
import { RoomState, QuizLifeline } from "../../../../party/types";
import { Clock, HelpCircle, Users, FastForward, CheckCircle2, XCircle, Award, Trophy, ChevronRight, Volume2, Shield } from "lucide-react";

interface QuizGameProps {
  roomState: RoomState;
  myId: string;
  onLockAnswer: (answer: string, isDouble?: boolean) => void;
  onUseLifeline: (lifeline: QuizLifeline) => void;
  onReturnToLobby: () => void;
  onSkipTimer?: () => void;
}

export const QuizGame: React.FC<QuizGameProps> = ({
  roomState,
  myId,
  onLockAnswer,
  onUseLifeline,
  onReturnToLobby,
  onSkipTimer,
}) => {
  const quiz = roomState.quizState;
  const isHost = roomState.hostId === myId;
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showLadder, setShowLadder] = useState(false);

  if (!quiz) return null;

  const currentQ = quiz.question;
  const myLocked = quiz.lockedAnswers?.[myId];
  const myDoubleLocked = quiz.doubleSecondAnswers?.[myId];
  const myUsedLifelines = quiz.usedLifelines?.[myId] || [];
  const myEliminated = quiz.eliminatedOptions?.[myId] || [];
  const hasDoubleDip = myUsedLifelines.includes("double_dip") && !myDoubleLocked;

  const handleSelectOption = (opt: string) => {
    if (quiz.phase !== "question") return;
    if (myLocked && !hasDoubleDip) return;
    if (myLocked && myLocked === opt) return;
    if (myEliminated.includes(opt as any)) return;

    if (myLocked && hasDoubleDip) {
      onLockAnswer(opt, true);
    } else {
      onLockAnswer(opt, false);
    }
  };

  const currentPrize = quiz.prizeValues[quiz.currentQuestion] || 1000;
  const players = Object.values(roomState.players).filter((p) => p.isConnected);
  const me = roomState.players[myId];

  return (
    <div className="relative flex flex-col h-full w-full bg-gradient-to-b from-[#050B1A] via-[#091530] to-[#02050D] text-white p-3 md:p-6 overflow-y-auto">
      {/* Top Header / Status Bar */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-[#050B1A] rounded-[14px] flex items-center justify-center font-black text-amber-400 text-lg">
                ₹
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
                  Question {quiz.currentQuestion + 1} of {quiz.totalQuestions}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-900/60 border border-blue-700/50 text-blue-300">
                  {currentQ.category}
                </span>
              </div>
              <div className="text-xl md:text-2xl font-black text-yellow-300 drop-shadow">
                ₹{currentPrize.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Personal Bank Display */}
          <div className="px-3.5 py-1.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 shadow-inner flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
              Your Bank
            </span>
            <span className="font-mono font-black text-base md:text-lg text-amber-300">
              ₹{(me?.score || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Timer & Controls */}
        <div className="flex items-center gap-2">
          {/* Lifelines Bar */}
          <div className="flex items-center gap-1.5 bg-[#0D1C3D]/80 border border-blue-800/40 p-1 rounded-2xl shadow-inner">
            {/* 50:50 */}
            <button
              onClick={() => onUseLifeline("fifty_fifty")}
              disabled={myUsedLifelines.includes("fifty_fifty") || quiz.phase !== "question" || !!myLocked}
              title="50:50 — Eliminate two wrong options"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                myUsedLifelines.includes("fifty_fifty")
                  ? "bg-slate-800/60 text-slate-500 line-through cursor-not-allowed border border-slate-700/30"
                  : "bg-gradient-to-b from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-yellow-300 border border-yellow-500/50 shadow-md shadow-blue-900/50 active:scale-95"
              }`}
            >
              50:50
            </button>

            {/* Audience Poll */}
            <button
              onClick={() => onUseLifeline("audience_poll")}
              disabled={myUsedLifelines.includes("audience_poll") || quiz.phase !== "question"}
              title="Audience Poll — See audience consensus"
              className={`p-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                myUsedLifelines.includes("audience_poll")
                  ? "bg-slate-800/60 text-slate-500 line-through cursor-not-allowed border border-slate-700/30"
                  : "bg-gradient-to-b from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white border border-blue-400/50 shadow-md shadow-blue-900/50 active:scale-95"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-300" />
              <span className="hidden sm:inline">Poll</span>
            </button>

            {/* Double Dip */}
            <button
              onClick={() => onUseLifeline("double_dip")}
              disabled={myUsedLifelines.includes("double_dip") || quiz.phase !== "question" || !!myLocked}
              title="Double Dip — Take two guesses"
              className={`p-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                myUsedLifelines.includes("double_dip")
                  ? "bg-slate-800/60 text-slate-500 line-through cursor-not-allowed border border-slate-700/30"
                  : "bg-gradient-to-b from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-purple-200 border border-purple-400/50 shadow-md shadow-purple-900/50 active:scale-95"
              }`}
            >
              <Award className="w-3.5 h-3.5 text-purple-300" />
              <span className="hidden sm:inline">2x Dip</span>
            </button>

            {/* Skip */}
            <button
              onClick={() => onUseLifeline("skip")}
              disabled={myUsedLifelines.includes("skip") || quiz.phase !== "question" || !!myLocked}
              title="Skip Question — Take the points and move on"
              className={`p-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                myUsedLifelines.includes("skip")
                  ? "bg-slate-800/60 text-slate-500 line-through cursor-not-allowed border border-slate-700/30"
                  : "bg-gradient-to-b from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-emerald-100 border border-emerald-400/50 shadow-md shadow-emerald-900/50 active:scale-95"
              }`}
            >
              <FastForward className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden sm:inline">Skip</span>
            </button>
          </div>

          {/* Ladder Toggle */}
          <button
            onClick={() => setShowLadder(!showLadder)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white"
          >
            Ladder
          </button>

          {/* Host Skip Timer */}
          {isHost && onSkipTimer && (
            <button
              onClick={onSkipTimer}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/30"
              title="Skip remaining time and reveal answer"
            >
              Force Reveal
            </button>
          )}

          {/* Exit / Lobby */}
          {isHost && (
            <button
              onClick={onReturnToLobby}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold hover:bg-rose-500/30"
            >
              Exit
            </button>
          )}

          {/* Clock Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#091530] border border-blue-700/60 shadow-lg">
            <Clock className={`w-4 h-4 ${quiz.timer <= 5 ? "text-rose-400 animate-ping" : "text-amber-400"}`} />
            <span className={`font-mono font-black text-lg ${quiz.timer <= 5 ? "text-rose-400" : "text-white"}`}>
              {quiz.timer}s
            </span>
          </div>
        </div>
      </div>

      {/* Main Game Arena */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left / Center: Question & Options */}
        <div className="flex-1 flex flex-col justify-between max-w-4xl mx-auto w-full">
          {/* Audience Poll Visualizer (if active) */}
          {quiz.audiencePoll && (
            <div className="mb-3 p-3 rounded-2xl bg-blue-950/80 border border-blue-600/50 shadow-lg">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-300 block mb-1.5">
                📊 Live Audience Poll:
              </span>
              <div className="grid grid-cols-4 gap-2">
                {(["A", "B", "C", "D"] as const).map((opt) => (
                  <div key={opt} className="flex flex-col items-center">
                    <span className="text-xs font-black text-yellow-400">{quiz.audiencePoll?.[opt]}%</span>
                    <div className="w-full bg-slate-900 rounded-full h-2.5 mt-1 overflow-hidden border border-slate-700">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-amber-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${quiz.audiencePoll?.[opt] || 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 mt-1">{opt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Question Box (Hexagon style with gold borders) */}
          <div className="relative my-auto py-6 px-6 md:px-10 rounded-3xl bg-gradient-to-b from-[#0D1E42] via-[#091530] to-[#050C1F] border-2 border-yellow-500/60 shadow-[0_0_35px_rgba(234,179,8,0.15)] text-center flex flex-col items-center justify-center min-h-[140px] md:min-h-[180px]">
            <div className="absolute -top-3 px-4 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-widest shadow">
              {quiz.phase === "reveal" ? "ANSWER REVEAL" : "LOCK YOUR ANSWER"}
            </div>
            <h2 className="text-lg md:text-2xl font-black text-slate-100 leading-relaxed drop-shadow-md">
              {currentQ.question}
            </h2>
          </div>

          {/* Options Grid (4 Hexagonal Styled Options) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 my-4">
            {(["A", "B", "C", "D"] as const).map((opt) => {
              const text = currentQ.options[opt];
              const isEliminated = myEliminated.includes(opt);
              const isMyLocked = myLocked === opt || myDoubleLocked === opt;
              const isRevealPhase = quiz.phase === "reveal";
              const isCorrectAnswer = quiz.correctReveal === opt;

              let btnStyle = "bg-[#091530] border-blue-700/60 text-slate-200 hover:border-yellow-400/80 hover:bg-[#0E204A]";
              let icon = null;

              if (isEliminated) {
                btnStyle = "bg-slate-950/40 border-slate-800/40 text-slate-600 line-through cursor-not-allowed opacity-30";
              } else if (isRevealPhase) {
                if (isCorrectAnswer) {
                  btnStyle = "bg-emerald-950 border-emerald-400 text-emerald-200 shadow-[0_0_25px_rgba(52,211,153,0.5)] scale-[1.02] animate-pulse";
                  icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
                } else if (isMyLocked) {
                  btnStyle = "bg-rose-950 border-rose-500 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.4)]";
                  icon = <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
                } else {
                  btnStyle = "bg-slate-950/60 border-slate-800 text-slate-600 opacity-40";
                }
              } else if (isMyLocked) {
                btnStyle = "bg-gradient-to-r from-amber-700 to-yellow-600 border-yellow-300 text-white shadow-[0_0_25px_rgba(234,179,8,0.5)] font-black scale-[1.01]";
              }

              return (
                <button
                  key={opt}
                  onClick={() => handleSelectOption(opt)}
                  disabled={isEliminated || (!!myLocked && !hasDoubleDip) || isRevealPhase}
                  className={`relative p-4 md:p-5 rounded-2xl border-2 transition-all flex items-center justify-between text-left group shadow-lg ${btnStyle}`}
                >
                  <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center font-black text-amber-400 text-sm shrink-0">
                      {opt}
                    </span>
                    <span className="font-bold text-sm md:text-base leading-snug">
                      {text}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {icon}
                    {isMyLocked && !isRevealPhase && (
                      <span className="px-2 py-0.5 rounded-full bg-yellow-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                        Locked
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Who Has Locked Live Bar */}
          <div className="mt-2 p-3 rounded-2xl bg-[#070F22]/90 border border-blue-900/40 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              Players Locked:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {players.map((p) => {
                const locked = quiz.hasLocked?.[p.id];
                const summary = quiz.answerSummary?.[p.id];
                return (
                  <div
                    key={p.id}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      quiz.phase === "reveal"
                        ? summary?.isCorrect
                          ? "bg-emerald-950/80 border border-emerald-500/60 text-emerald-300"
                          : "bg-rose-950/80 border border-rose-500/60 text-rose-300"
                        : locked
                        ? "bg-amber-950/80 border border-amber-500/50 text-amber-300 animate-pulse"
                        : "bg-slate-900/60 border border-slate-800 text-slate-500"
                    }`}
                  >
                    <span>{p.avatar}</span>
                    <span>{p.name}</span>
                    <span className="font-mono text-[11px] text-yellow-400 font-bold">
                      ₹{p.score.toLocaleString()}
                    </span>
                    {quiz.phase === "reveal" ? (
                      summary?.isCorrect ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      )
                    ) : locked ? (
                      <span className="text-[10px] text-amber-400">🔒</span>
                    ) : (
                      <span className="text-[10px] text-slate-500">⏳</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: 15-Question Money Tracker (Desktop or Toggled) */}
        <div
          className={`${
            showLadder ? "fixed inset-0 z-50 p-4 bg-slate-950/90 flex flex-col justify-center" : "hidden lg:flex"
          } w-full lg:w-64 flex-col bg-[#070F22] border border-blue-900/60 rounded-3xl p-3 shrink-0 shadow-2xl overflow-y-auto max-h-[560px]`}
        >
          <div className="flex items-center justify-between mb-2 px-2">
            <div>
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider block">
                💰 Question Status
              </span>
              <span className="text-[10px] text-slate-400">₹10,000 / correct answer</span>
            </div>
            {showLadder && (
              <button
                onClick={() => setShowLadder(false)}
                className="px-2 py-0.5 rounded-lg bg-slate-800 text-xs font-bold text-white"
              >
                Close
              </button>
            )}
          </div>

          <div className="flex flex-col-reverse gap-1.5">
            {Array.from({ length: quiz.totalQuestions || 15 }).map((_, idx) => {
              const myHistory = quiz.playerHistory?.[myId];
              const hasResult = myHistory && myHistory[idx] !== undefined;
              const isCorrect = myHistory?.[idx] === true;
              const isCurrent = idx === quiz.currentQuestion;

              let rowStyle = "bg-slate-950/30 text-slate-500 border-slate-800/40";
              let statusBadge = <span className="font-mono text-slate-400">₹10,000</span>;

              if (hasResult) {
                if (isCorrect) {
                  rowStyle = "bg-emerald-950/70 border-emerald-500/80 text-emerald-200 font-bold shadow-[0_0_12px_rgba(16,185,129,0.25)]";
                  statusBadge = <span className="text-emerald-300 flex items-center gap-1 font-black">✓ +₹10,000</span>;
                } else {
                  rowStyle = "bg-rose-950/70 border-rose-500/80 text-rose-200 font-bold shadow-[0_0_12px_rgba(244,63,94,0.25)]";
                  statusBadge = <span className="text-rose-300 flex items-center gap-1 font-black">✗ +₹0</span>;
                }
              } else if (isCurrent) {
                rowStyle = "bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/30 scale-[1.02] border-yellow-300";
                statusBadge = <span className="font-black text-slate-950">Active</span>;
              }

              return (
                <div
                  key={idx}
                  className={`px-3 py-1.5 rounded-xl text-xs border flex items-center justify-between transition-all ${rowStyle}`}
                >
                  <span className="font-mono font-bold text-[11px]">
                    Q{idx + 1}
                  </span>
                  {statusBadge}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal: Game Over / Podium */}
      {quiz.phase === "game_over" && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-1 shadow-2xl shadow-yellow-500/40 mb-3 flex items-center justify-center">
            <Trophy className="w-9 h-9 text-slate-950" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-yellow-400 mb-1">
            QUIZ CONCLUDED!
          </h2>
          <p className="text-sm text-slate-300 mb-6">Here are the final prize amounts won by each player:</p>

          <div className="w-full max-w-md bg-[#091530] border border-blue-700/60 rounded-3xl p-4 flex flex-col gap-2.5 shadow-2xl">
            {players
              .sort((a, b) => b.score - a.score)
              .map((p, rank) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-2xl ${
                    rank === 0
                      ? "bg-gradient-to-r from-amber-600/30 to-yellow-500/20 border border-yellow-500/60 text-yellow-300"
                      : "bg-slate-900/60 border border-slate-800 text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-black text-sm w-6">#{rank + 1}</span>
                    <span className="text-2xl">{p.avatar}</span>
                    <span className="font-bold text-sm">{p.name}</span>
                  </div>
                  <span className="font-mono font-black text-lg text-yellow-400">
                    ₹{p.score.toLocaleString()}
                  </span>
                </div>
              ))}
          </div>

          {isHost && (
            <button
              onClick={onReturnToLobby}
              className="mt-6 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-blue-600/30 active:scale-95 transition-all"
            >
              Return to Lobby
            </button>
          )}
        </div>
      )}
    </div>
  );
};

