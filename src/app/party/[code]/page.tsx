"use client";

import React, { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Wifi, WifiOff, RefreshCw, AlertTriangle, Home } from "lucide-react";
import { usePartyRoom } from "@/hooks/usePartyRoom";
import { LobbyView } from "@/components/lobby/LobbyView";
import { SkribblGame } from "@/components/games/skribbl/SkribblGame";
import { FortuneGame } from "@/components/games/fortune/FortuneGame";
import { MysteryGame } from "@/components/games/mystery/MysteryGame";
import { GarticGame } from "@/components/games/gartic/GarticGame";
import { QuizGame } from "@/components/games/quiz/QuizGame";
import { ImposterGame } from "@/components/games/imposter/ImposterGame";
import { MastermindGame } from "@/components/games/mastermind/MastermindGame";
import { PartyChat } from "@/components/chat/PartyChat";
import { ProfileModal } from "@/components/lobby/ProfileModal";
import { ServerStatusBadge } from "@/components/common/ServerStatusBadge";

interface PartyRoomPageProps {
  params: Promise<{ code: string }>;
}

const CHAT_WIDTHS = [
  { label: "S", class: "w-full md:w-64" },
  { label: "M", class: "w-full md:w-80" },
  { label: "L", class: "w-full md:w-96" },
  { label: "XL", class: "w-full md:w-[440px]" },
];

export default function PartyRoomPage({ params }: PartyRoomPageProps) {
  const router = useRouter();
  const { code } = use(params);
  const roomCode = (code || "").toUpperCase();

  const [chatWidthIdx, setChatWidthIdx] = useState(1);
  const [connectTimeout, setConnectTimeout] = useState(false);
  const [showFirstJoinModal, setShowFirstJoinModal] = useState(false);

  const {
    roomState,
    messages,
    isConnected,
    reconnect,
    myId,
    sendChat,
    updateProfile,
    updateSettings,
    toggleReady,
    selectGame,
    startGame,
    returnToLobby,
    chooseWord,
    sendDrawCommand,
    registerDrawHandler,
    setFortunePhrase,
    guessFortuneLetter,
    setMysteryImage,
    revealMysteryTile,
    submitGarticPrompt,
    submitGarticDrawing,
    submitGarticGuess,
    nextGarticStep,
    prevGarticStep,
    selectGarticChain,
    selectGarticStep,
    lockQuizAnswer,
    useQuizLifeline,
    submitImposterClue,
    voteImposter,
    guessImposterWord,
    submitMastermindMinigameScore,
    buyMastermindItem,
    useMastermindAbility,
    voteMastermindSuspect,
    nextMastermindPhase,
    skipTimer,
  } = usePartyRoom(roomCode);

  // Check if direct link joiner needs to set a profile (only if no name was ever chosen)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("party_player_name");
      const customized = localStorage.getItem("party_player_customized");
      if (!savedName && !customized) {
        setShowFirstJoinModal(true);
      }
    }
  }, []);

  // Watchdog timer
  useEffect(() => {
    if (roomState) {
      setConnectTimeout(false);
      return;
    }
    const timer = setTimeout(() => {
      if (!roomState) {
        setConnectTimeout(true);
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [roomState]);

  const cycleChatWidth = () => {
    setChatWidthIdx((prev) => (prev + 1) % CHAT_WIDTHS.length);
  };

  // Loading Screen
  if (!roomState) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="p-6 md:p-8 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center gap-4 max-w-md w-full text-center shadow-2xl">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />

          <div>
            <h2 className="text-xl font-bold text-white">Connecting to Room {roomCode}</h2>
            <p className="text-xs text-slate-400 mt-1">Establishing secure multiplayer connection...</p>
          </div>

          <div className="w-full">
            <ServerStatusBadge />
          </div>

          {connectTimeout && (
            <div className="w-full mt-2 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-left animate-fade-in">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs mb-1">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Connecting to Game Server...</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                Still connecting to the party room. Please wait a moment while the server establishes the live game session.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setConnectTimeout(false);
                    reconnect();
                  }}
                  className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Connection</span>
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-all"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Home</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active creator/drawer chat lock
  const isSkribblDrawer =
    roomState.status === "playing" &&
    roomState.skribblState?.phase === "drawing" &&
    (roomState.skribblState?.mode === "duel"
      ? roomState.skribblState.drawer1Id === myId || roomState.skribblState.drawer2Id === myId
      : roomState.skribblState?.currentDrawerId === myId);

  const isFortuneCreator =
    roomState.status === "playing" &&
    roomState.selectedGameId === "word_fortune" &&
    roomState.fortuneState?.puzzleCreatorId === myId;

  const isMysteryCreator =
    roomState.status === "playing" &&
    roomState.selectedGameId === "mystery_reveal" &&
    roomState.mysteryState?.creatorId === myId;

  const isChatLocked = isSkribblDrawer || isFortuneCreator || isMysteryCreator;

  const me = roomState.players[myId];

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden relative">
      {/* Top Navigation Bar */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            title="Leave Party"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-base">
              Party<span className="text-indigo-400">Hub</span>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold">
              {roomCode}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {isConnected ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Connected</span>
              </span>
            ) : (
              <button
                onClick={reconnect}
                className="flex items-center gap-1 text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20"
                title="Click to reconnect"
              >
                <WifiOff className="w-3.5 h-3.5" />
                <span>Reconnect</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Play Area & Chat */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-3 gap-3">
        {/* Disconnected Banner */}
        {!isConnected && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-rose-950/95 border border-rose-500/50 rounded-2xl shadow-2xl shadow-rose-900/60 animate-fade-in">
            <WifiOff className="w-4 h-4 text-rose-400 animate-pulse" />
            <span className="text-sm font-bold text-rose-300">Disconnected</span>
            <button
              onClick={reconnect}
              className="ml-2 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              Reconnect
            </button>
          </div>
        )}
        {/* Left / Game Content Stage */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {roomState.status === "lobby" ? (
            <LobbyView
              roomState={roomState}
              myId={myId}
              onSelectGame={selectGame}
              onUpdateSettings={updateSettings}
              onUpdateProfile={updateProfile}
              onToggleReady={toggleReady}
              onStartGame={startGame}
            />
          ) : roomState.selectedGameId === "word_fortune" ? (
            <FortuneGame
              roomState={roomState}
              myId={myId}
              onSetPhrase={setFortunePhrase}
              onGuessLetter={guessFortuneLetter}
              onReturnToLobby={returnToLobby}
            />
          ) : roomState.selectedGameId === "mystery_reveal" ? (
            <MysteryGame
              roomState={roomState}
              myId={myId}
              onSetImage={setMysteryImage}
              onRevealTile={revealMysteryTile}
              onReturnToLobby={returnToLobby}
            />
          ) : roomState.selectedGameId === "gartic" ? (
            <GarticGame
              roomState={roomState}
              myId={myId}
              onSubmitPrompt={submitGarticPrompt}
              onSubmitDrawing={submitGarticDrawing}
              onSubmitGuess={submitGarticGuess}
              onNextPresentationStep={nextGarticStep}
              onPrevPresentationStep={prevGarticStep}
              onSelectPresentationChain={selectGarticChain}
              onSelectPresentationStep={selectGarticStep}
              onReturnToLobby={returnToLobby}
            />
          ) : roomState.selectedGameId === "quiz_kbc" ? (
            <QuizGame
              roomState={roomState}
              myId={myId}
              onLockAnswer={lockQuizAnswer}
              onUseLifeline={useQuizLifeline}
              onReturnToLobby={returnToLobby}
              onSkipTimer={skipTimer}
            />
          ) : roomState.selectedGameId === "word_imposter" ? (
            <ImposterGame
              roomState={roomState}
              myId={myId}
              onSubmitClue={submitImposterClue}
              onVote={voteImposter}
              onGuessWord={guessImposterWord}
              onReturnToLobby={returnToLobby}
              onSkipTimer={skipTimer}
            />
          ) : roomState.selectedGameId === "mastermind" ? (
            <MastermindGame
              roomState={roomState}
              myId={myId}
              onSubmitMinigameScore={submitMastermindMinigameScore}
              onBuyItem={buyMastermindItem}
              onUseAbility={useMastermindAbility}
              onVoteSuspect={voteMastermindSuspect}
              onReturnToLobby={returnToLobby}
              onSkipTimer={skipTimer}
            />
          ) : (
            <SkribblGame
              roomState={roomState}
              myId={myId}
              onChooseWord={chooseWord}
              onDrawCommand={sendDrawCommand}
              registerDrawHandler={registerDrawHandler}
              onReturnToLobby={returnToLobby}
              onSendGuess={sendChat}
            />
          )}
        </div>

        {/* Right / Modular Party Chat Panel */}
        <div
          className={`${CHAT_WIDTHS[chatWidthIdx].class} h-64 md:h-full flex-shrink-0 transition-all duration-200`}
        >
          <PartyChat
            messages={messages}
            onSendMessage={sendChat}
            isDrawer={isChatLocked}
            onCycleWidth={cycleChatWidth}
            widthLabel={CHAT_WIDTHS[chatWidthIdx].label}
            placeholder={
              roomState.status === "playing"
                ? roomState.selectedGameId === "word_fortune"
                  ? "Type full phrase to solve..."
                  : "Type your guess here..."
                : "Chat with party members..."
            }
          />
        </div>
      </div>

      {/* First Join Customization Modal */}
      <ProfileModal
        initialName={me?.name || ""}
        initialAvatar={me?.avatar || "🎨"}
        isOpen={showFirstJoinModal}
        isFirstJoin={true}
        title={`Welcome to Room ${roomCode}!`}
        onSave={(name, avatar) => {
          updateProfile(name, avatar);
          setShowFirstJoinModal(false);
        }}
      />
    </div>
  );
}
