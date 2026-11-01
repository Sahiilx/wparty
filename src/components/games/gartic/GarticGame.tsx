"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Trophy,
  Crown,
  ArrowLeft,
  Sparkles,
  Send,
  Play,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  PenTool,
  BookOpen,
  Layers,
  User,
} from "lucide-react";
import confetti from "canvas-confetti";
import { RoomState, DrawCommand, GarticChain } from "../../../../party/types";
import { DrawingCanvas } from "../skribbl/DrawingCanvas";

interface GarticGameProps {
  roomState: RoomState;
  myId: string;
  onSubmitPrompt: (text: string) => void;
  onSubmitDrawing: (commands: DrawCommand[]) => void;
  onSubmitGuess: (text: string) => void;
  onNextPresentationStep: () => void;
  onPrevPresentationStep?: () => void;
  onSelectPresentationChain?: (chainIndex: number) => void;
  onSelectPresentationStep?: (stepIndex: number) => void;
  onReturnToLobby: () => void;
}

export function GarticGame({
  roomState,
  myId,
  onSubmitPrompt,
  onSubmitDrawing,
  onSubmitGuess,
  onNextPresentationStep,
  onPrevPresentationStep,
  onSelectPresentationChain,
  onSelectPresentationStep,
  onReturnToLobby,
}: GarticGameProps) {
  const gartic = roomState.garticState;
  if (!gartic) return null;

  const isHost = roomState.hostId === myId;
  const isSubmitted = gartic.submittedPlayerIds.includes(myId);

  const [promptInput, setPromptInput] = useState("");
  const [guessInput, setGuessInput] = useState("");
  const [localDrawingCommands, setLocalDrawingCommands] = useState<DrawCommand[]>([]);
  const [showFullAlbum, setShowFullAlbum] = useState(false);

  // Confetti on presentation end
  useEffect(() => {
    if (gartic.phase === "game_over") {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
  }, [gartic.phase]);

  // Determine which chain is assigned to this player for the current round
  const playerIds = Object.keys(roomState.players).filter((id) => roomState.players[id].isConnected);
  const myIndex = playerIds.indexOf(myId);
  const shift = gartic.roundNumber - 1;
  const assignedChainOwnerId =
    myIndex !== -1 ? playerIds[(myIndex - shift + playerIds.length * 100) % playerIds.length] : myId;
  const assignedChain = gartic.chains[assignedChainOwnerId];

  // The last step in that assigned chain is what this player needs to draw or guess!
  const previousStep =
    assignedChain && assignedChain.steps.length > 0
      ? assignedChain.steps[assignedChain.steps.length - 1]
      : null;

  // Presentation slideshow current item
  const chainKeys = Object.keys(gartic.chains);
  const currentShowcaseChain: GarticChain | null =
    chainKeys[gartic.presentationChainIndex] ? gartic.chains[chainKeys[gartic.presentationChainIndex]] : null;
  const currentShowcaseStep =
    currentShowcaseChain && currentShowcaseChain.steps[gartic.presentationStepIndex]
      ? currentShowcaseChain.steps[gartic.presentationStepIndex]
      : null;

  return (
    <div className="relative flex flex-col h-full w-full gap-2.5 overflow-hidden">
      {/* Top Game Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-lg flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-black">
            📞 TELEPHONE TALE
          </span>
          <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
            Turn {gartic.roundNumber} / {gartic.totalRounds}
          </span>
        </div>

        <div className="text-xs font-bold text-indigo-300">
          {gartic.phase === "writing" && "Phase 1: Write an Original Prompt"}
          {gartic.phase === "drawing" && "Phase 2: Draw What You Received"}
          {gartic.phase === "guessing" && "Phase 3: Guess The Drawing"}
          {gartic.phase === "presentation" && "Album Reveal Showcase"}
          {gartic.phase === "game_over" && "Game Over"}
        </div>

        <div className="flex items-center gap-2">
          {isHost && (
            <button
              onClick={onReturnToLobby}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all"
            >
              End Game
            </button>
          )}

          {gartic.phase !== "presentation" && gartic.phase !== "game_over" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
              <Clock className={`w-4 h-4 ${gartic.timer <= 10 ? "text-rose-400 animate-pulse" : "text-amber-400"}`} />
              <span className={`font-mono font-bold text-base ${gartic.timer <= 10 ? "text-rose-400" : "text-white"}`}>
                {gartic.timer}s
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Game Stage */}
      <div className="relative flex-1 bg-gradient-to-b from-blue-950/20 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-4 flex flex-col items-center justify-center shadow-2xl overflow-hidden">
        {/* --- PHASE 1: WRITING INITIAL PROMPT --- */}
        {gartic.phase === "writing" && (
          <div className="max-w-md w-full bg-slate-950/80 border border-slate-800 rounded-3xl p-6 text-center shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center mx-auto mb-3 text-2xl">
              ✍️
            </div>
            <h2 className="text-xl font-black text-white mb-1">Write an Original Sentence</h2>
            <p className="text-xs text-slate-400 mb-4">
              Write something crazy, weird, or funny for someone else in the party to draw:
            </p>

            {isSubmitted ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Prompt locked in! Waiting for others ({gartic.submittedPlayerIds.length}/{playerIds.length})...</span>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!promptInput.trim()) return;
                  onSubmitPrompt(promptInput.trim());
                }}
                className="space-y-3"
              >
                <input
                  type="text"
                  maxLength={100}
                  placeholder="e.g. A cowboy riding an angry llama on the moon"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!promptInput.trim()}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/30 transition-all"
                >
                  Submit Secret Prompt
                </button>
              </form>
            )}
          </div>
        )}

        {/* --- PHASE 2: DRAWING --- */}
        {gartic.phase === "drawing" && (
          <div className="w-full h-full flex flex-col gap-2">
            {/* Top Prompt Banner */}
            <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider block">
                  You are drawing this prompt:
                </span>
                <span className="text-sm md:text-base font-extrabold text-white">
                  &ldquo;{previousStep?.type === "prompt" ? previousStep.text : "A funny cat"}&rdquo;
                </span>
              </div>

              {!isSubmitted && (
                <button
                  onClick={() => onSubmitDrawing(localDrawingCommands)}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Drawing</span>
                </button>
              )}
            </div>

            {/* Drawing Canvas */}
            <div className="flex-1 min-h-[340px]">
              {isSubmitted ? (
                <div className="w-full h-full bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center p-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                  <h3 className="text-base font-bold text-white mb-1">Drawing submitted!</h3>
                  <p className="text-xs text-slate-400">Waiting for other party members to finish drawing...</p>
                </div>
              ) : (
                <DrawingCanvas
                  isDrawer={true}
                  canvasHistory={localDrawingCommands}
                  onDrawCommand={(cmd) => setLocalDrawingCommands((prev) => [...prev, cmd])}
                />
              )}
            </div>
          </div>
        )}

        {/* --- PHASE 3: GUESSING --- */}
        {gartic.phase === "guessing" && (
          <div className="w-full h-full flex flex-col gap-2">
            <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-center">
              <span className="text-xs font-bold text-blue-400">
                WHAT WAS DRAWN HERE? Study the drawing and guess below:
              </span>
            </div>

            {/* Read-Only Canvas Displaying the Teammate's Drawing */}
            <div className="flex-1 min-h-[300px]">
              <DrawingCanvas
                isDrawer={false}
                canvasHistory={previousStep?.type === "drawing" ? previousStep.drawingCommands : []}
              />
            </div>

            {/* Guess Input */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
              {isSubmitted ? (
                <div className="text-center text-xs font-bold text-emerald-400 py-1">
                  ✓ Your interpretation submitted! Waiting for teammates...
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!guessInput.trim()) return;
                    onSubmitGuess(guessInput.trim());
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="Describe what you see..."
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!guessInput.trim()}
                    className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all"
                  >
                    Lock In Guess
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* --- PHASE 4: PRESENTATION SLIDESHOW GALLERY --- */}
        {gartic.phase === "presentation" && currentShowcaseChain && (
          <div className="w-full h-full flex flex-col gap-2.5 overflow-hidden">
            {/* Gallery Navigation Bar */}
            <div className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                  Story #{gartic.presentationChainIndex + 1}/{chainKeys.length}:
                </span>
                <span className="text-sm font-extrabold text-white">
                  {currentShowcaseChain.originalAuthorName}&rsquo;s Album
                </span>
              </div>

              {/* View Mode Toggle & Serial Step Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowFullAlbum(!showFullAlbum)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border transition-all ${
                    showFullAlbum
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                  }`}
                  title="Toggle Full Story Strip vs Step-by-Step"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{showFullAlbum ? "Slideshow" : "Full Story"}</span>
                </button>

                {isHost && (
                  <>
                    <button
                      type="button"
                      onClick={onPrevPresentationStep}
                      disabled={gartic.presentationChainIndex === 0 && gartic.presentationStepIndex === 0}
                      className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 font-bold rounded-xl text-xs border border-slate-800 flex items-center gap-1 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Prev</span>
                    </button>

                    <button
                      type="button"
                      onClick={onNextPresentationStep}
                      className="py-1.5 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1 shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Specific Player Story Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
                <User className="w-3 h-3" /> Albums:
              </span>
              {chainKeys.map((ownerId, idx) => {
                const chain = gartic.chains[ownerId];
                const isActive = gartic.presentationChainIndex === idx;
                return (
                  <button
                    key={ownerId}
                    type="button"
                    onClick={() => onSelectPresentationChain?.(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                      isActive
                        ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black scale-105"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <span>📖</span>
                    <span>{chain.originalAuthorName}&rsquo;s Tale</span>
                  </button>
                );
              })}
            </div>

            {/* Step Timeline Pills (in slideshow mode) */}
            {!showFullAlbum && currentShowcaseChain && (
              <div className="flex items-center justify-center gap-1.5 overflow-x-auto py-1">
                {currentShowcaseChain.steps.map((st, stepIdx) => {
                  const isCurrent = gartic.presentationStepIndex === stepIdx;
                  return (
                    <button
                      key={stepIdx}
                      type="button"
                      onClick={() => onSelectPresentationStep?.(stepIdx)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 border ${
                        isCurrent
                          ? "bg-indigo-600 text-white border-indigo-400 shadow-md scale-105"
                          : "bg-slate-950/70 text-slate-400 border-slate-800 hover:bg-slate-800"
                      }`}
                    >
                      <span>{st.type === "prompt" ? "✍️" : "🎨"}</span>
                      <span>
                        {stepIdx === 0
                          ? "Prompt"
                          : st.type === "prompt"
                          ? `Guess #${stepIdx}`
                          : `Sketch #${stepIdx}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Content Area: Single Slideshow or Full Story Strip */}
            <div className="flex-1 bg-slate-950/80 rounded-2xl border border-slate-800 p-4 overflow-y-auto flex flex-col items-center justify-center">
              {showFullAlbum ? (
                /* FULL ALBUM COMIC STRIP */
                <div className="w-full max-w-2xl space-y-4 py-2">
                  <div className="text-center pb-2 border-b border-slate-800">
                    <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">
                      Complete Story Album
                    </span>
                    <h3 className="text-xl font-black text-white">
                      Started by {currentShowcaseChain.originalAuthorName}
                    </h3>
                  </div>

                  {currentShowcaseChain.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center gap-2"
                    >
                      <div className="w-full flex items-center justify-between text-xs text-slate-400">
                        <span className="font-bold text-indigo-400">
                          Step {idx + 1}: {step.type === "prompt" ? "Word Prompt" : "Drawing"}
                        </span>
                        <span className="text-slate-300">By {step.authorName}</span>
                      </div>

                      {step.type === "prompt" ? (
                        <p className="text-lg md:text-xl font-black text-indigo-200 italic my-2 text-center">
                          &ldquo;{step.text}&rdquo;
                        </p>
                      ) : (
                        <div className="w-full max-w-md h-64 bg-white rounded-xl overflow-hidden my-1">
                          <DrawingCanvas isDrawer={false} canvasHistory={step.drawingCommands} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* STEP-BY-STEP SLIDESHOW DISPLAY */
                <div className="w-full h-full flex flex-col items-center justify-center">
                  {currentShowcaseStep?.type === "prompt" && (
                    <div className="max-w-lg text-center animate-fade-in p-6 bg-slate-900/60 rounded-3xl border border-slate-800 shadow-2xl">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-2">
                        {gartic.presentationStepIndex === 0
                          ? `Original Secret Prompt by ${currentShowcaseStep.authorName}:`
                          : `${currentShowcaseStep.authorName} guessed:`}
                      </span>
                      <h3 className="text-2xl md:text-3xl font-black text-white italic mb-2">
                        &ldquo;{currentShowcaseStep.text}&rdquo;
                      </h3>
                    </div>
                  )}

                  {currentShowcaseStep?.type === "drawing" && (
                    <div className="w-full h-full flex flex-col items-center justify-center animate-fade-in">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
                        🎨 {currentShowcaseStep.authorName} drew:
                      </span>
                      <div className="flex-1 w-full max-w-xl min-h-[300px]">
                        <DrawingCanvas isDrawer={false} canvasHistory={currentShowcaseStep.drawingCommands} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- PHASE 5: GAME OVER PODIUM --- */}
        {gartic.phase === "game_over" && (
          <div className="text-center p-6 max-w-md">
            <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-2 animate-bounce" />
            <h2 className="text-3xl font-black text-white mb-2">Telephone Chain Complete!</h2>
            <p className="text-xs text-slate-400 mb-6">What a journey of funny prompts and wild sketches!</p>

            {isHost && (
              <button
                onClick={onReturnToLobby}
                className="py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 mx-auto"
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

