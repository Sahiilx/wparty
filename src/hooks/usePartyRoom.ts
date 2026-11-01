"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import PartySocket from "partysocket";
import { RoomState, ServerMessage, ClientMessage, DrawCommand, ChatMessage, GameId, RoomSettings } from "../../party/types";

export function usePartyRoom(roomCode: string) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [resolvedHost, setResolvedHost] = useState<string | null>(
    (process.env.NEXT_PUBLIC_PARTYKIT_HOST && !process.env.NEXT_PUBLIC_PARTYKIT_HOST.includes("partykit.dev"))
      ? process.env.NEXT_PUBLIC_PARTYKIT_HOST
      : null
  );
  const [myId, setMyId] = useState<string>("");
  const socketRef = useRef<PartySocket | null>(null);
  const onDrawCommandRef = useRef<((cmd: DrawCommand) => void) | null>(null);

  // Fetch host from server endpoint if public prefix is omitted in Vercel
  useEffect(() => {
    if (!resolvedHost && typeof window !== "undefined") {
      fetch("/api/party-host")
        .then((r) => r.json())
        .then((d) => {
          if (d?.host) setResolvedHost(d.host);
        })
        .catch(() => {});
    }
  }, [resolvedHost]);

  const connect = useCallback(() => {
    if (!roomCode) return;

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setConnectionError(null);

    let partyHost: string | undefined = resolvedHost || process.env.NEXT_PUBLIC_PARTYKIT_HOST;
    if (partyHost && partyHost.includes("partykit.dev")) {
      partyHost = undefined;
    }
    if (!partyHost && typeof window !== "undefined") {
      partyHost = window.location.host;
    }

    const effectiveHost = partyHost || (typeof window !== "undefined" ? window.location.host : "localhost:3000");

    let savedId: string | undefined = undefined;
    if (typeof window !== "undefined") {
      savedId = sessionStorage.getItem(`party_socket_id_${roomCode.toUpperCase()}`) || undefined;
    }

    try {
      const socket = new PartySocket({
        id: savedId,
        host: effectiveHost,
        room: roomCode.toUpperCase(),
      });

      if (typeof window !== "undefined" && socket.id) {
        sessionStorage.setItem(`party_socket_id_${roomCode.toUpperCase()}`, socket.id);
      }

      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setIsConnected(true);
        setConnectionError(null);
        setMyId(socket.id);

        const name = localStorage.getItem("party_player_name") || `Player_${socket.id.slice(0, 4)}`;
        const avatar = localStorage.getItem("party_player_avatar") || "🎨";

        const joinMsg: ClientMessage = {
          type: "JOIN_ROOM",
          name,
          avatar,
        };
        socket.send(JSON.stringify(joinMsg));
      });

      socket.addEventListener("message", (event) => {
        try {
          const msg = JSON.parse(event.data) as ServerMessage;
          if (msg.type === "SYNC_STATE") {
            setRoomState(msg.state);
            setMessages(msg.state.chat || []);
          } else if (msg.type === "CHAT_MESSAGE") {
            setMessages((prev) => [...prev, msg.message]);
          } else if (msg.type === "SKRIBBL_DRAW_COMMAND") {
            if (onDrawCommandRef.current) {
              onDrawCommandRef.current(msg.command);
            }
          }
        } catch (err) {
          console.error("Failed to parse server message", err);
        }
      });

      socket.addEventListener("error", (e) => {
        console.warn("[PartyHub] Socket error:", e);
        setConnectionError("Could not connect to multiplayer game server. Retrying...");
      });

      socket.addEventListener("close", () => {
        setIsConnected(false);
      });
    } catch (err) {
      setConnectionError(String(err));
    }
  }, [roomCode, resolvedHost]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((msg: ClientMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const sendChat = useCallback((text: string, targetBoard?: '1' | '2') => {
    send({ type: "SEND_CHAT", text, targetBoard });
  }, [send]);

  const updateProfile = useCallback((name?: string, avatar?: string) => {
    if (name) localStorage.setItem("party_player_name", name);
    if (avatar) localStorage.setItem("party_player_avatar", avatar);
    localStorage.setItem("party_player_customized", "true");
    send({ type: "UPDATE_PROFILE", name, avatar });
  }, [send]);

  const updateSettings = useCallback((settings: Partial<RoomSettings>) => {
    send({ type: "UPDATE_SETTINGS", settings });
  }, [send]);

  const toggleReady = useCallback(() => {
    send({ type: "TOGGLE_READY" });
  }, [send]);

  const selectGame = useCallback((gameId: GameId) => {
    send({ type: "SELECT_GAME", gameId });
  }, [send]);

  const startGame = useCallback(() => {
    send({ type: "START_GAME" });
  }, [send]);

  const returnToLobby = useCallback(() => {
    send({ type: "RETURN_TO_LOBBY" });
  }, [send]);

  // Skribbl
  const chooseWord = useCallback((word: string) => {
    send({ type: "SKRIBBL_CHOOSE_WORD", word });
  }, [send]);

  const sendDrawCommand = useCallback((command: DrawCommand) => {
    send({ type: "SKRIBBL_DRAW_COMMAND", command });
  }, [send]);

  const registerDrawHandler = useCallback((handler: (cmd: DrawCommand) => void) => {
    onDrawCommandRef.current = handler;
  }, []);

  // Fortune
  const setFortunePhrase = useCallback((phrase: string, category: string) => {
    send({ type: "FORTUNE_SET_PHRASE", phrase, category });
  }, [send]);

  const guessFortuneLetter = useCallback((letter: string) => {
    send({ type: "FORTUNE_GUESS_LETTER", letter });
  }, [send]);

  // Mystery
  const setMysteryImage = useCallback((
    imageUrl: string,
    answer: string,
    category: string,
    filterMode: 'silhouette' | 'tiles' | 'custom_blackout',
    blackoutDataUrl?: string,
    bgColor?: string
  ) => {
    send({ type: "MYSTERY_SET_IMAGE", imageUrl, answer, category, filterMode, blackoutDataUrl, bgColor });
  }, [send]);

  const revealMysteryTile = useCallback((tileIndex: number) => {
    send({ type: "MYSTERY_REVEAL_TILE", tileIndex });
  }, [send]);

  // Gartic Phone
  const submitGarticPrompt = useCallback((text: string) => {
    send({ type: "GARTIC_SUBMIT_PROMPT", text });
  }, [send]);

  const submitGarticDrawing = useCallback((commands: DrawCommand[]) => {
    send({ type: "GARTIC_SUBMIT_DRAWING", commands });
  }, [send]);

  const submitGarticGuess = useCallback((text: string) => {
    send({ type: "GARTIC_SUBMIT_GUESS", text });
  }, [send]);

  const nextGarticStep = useCallback(() => {
    send({ type: "GARTIC_NEXT_PRESENTATION_STEP" });
  }, [send]);

  const prevGarticStep = useCallback(() => {
    send({ type: "GARTIC_PREV_PRESENTATION_STEP" });
  }, [send]);

  const selectGarticChain = useCallback((chainIndex: number) => {
    send({ type: "GARTIC_SELECT_PRESENTATION_CHAIN", chainIndex });
  }, [send]);

  const selectGarticStep = useCallback((stepIndex: number) => {
    send({ type: "GARTIC_SELECT_PRESENTATION_STEP", stepIndex });
  }, [send]);

  // Quiz KBC
  const lockQuizAnswer = useCallback((answer: string, isDouble?: boolean) => {
    send({ type: "QUIZ_LOCK_ANSWER", answer, isDouble });
  }, [send]);

  const useQuizLifeline = useCallback((lifeline: import("../../party/types").QuizLifeline) => {
    send({ type: "QUIZ_USE_LIFELINE", lifeline });
  }, [send]);

  // Imposter
  const submitImposterClue = useCallback((clue: string) => {
    send({ type: "IMPOSTER_SUBMIT_CLUE", clue });
  }, [send]);

  const voteImposter = useCallback((suspectId: string) => {
    send({ type: "IMPOSTER_VOTE", suspectId });
  }, [send]);

  const guessImposterWord = useCallback((guess: string) => {
    send({ type: "IMPOSTER_GUESS_WORD", guess });
  }, [send]);

  // Mastermind Protocol
  const submitMastermindMinigameScore = useCallback((score: number) => {
    send({ type: "MASTERMIND_SUBMIT_MINIGAME_SCORE", score });
  }, [send]);

  const buyMastermindItem = useCallback((item: import("../../party/types").MastermindItem) => {
    send({ type: "MASTERMIND_BUY_ITEM", item });
  }, [send]);

  const useMastermindAbility = useCallback((abilityType: string, targetId?: string) => {
    send({ type: "MASTERMIND_USE_ABILITY", abilityType, targetId });
  }, [send]);

  const voteMastermindSuspect = useCallback((suspectId: string) => {
    send({ type: "MASTERMIND_VOTE_SUSPECT", suspectId });
  }, [send]);

  const nextMastermindPhase = useCallback(() => {
    send({ type: "MASTERMIND_NEXT_PHASE" });
  }, [send]);

  // Host Skip Timer
  const skipTimer = useCallback(() => {
    send({ type: "HOST_SKIP_TIMER" });
  }, [send]);

  return {
    roomState,
    messages,
    isConnected,
    connectionError,
    reconnect: connect,
    myId,
    sendChat,
    updateProfile,
    updateSettings,
    toggleReady,
    selectGame,
    startGame,
    returnToLobby,
    skipTimer,
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
  };
}
