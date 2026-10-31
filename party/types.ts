export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  isConnected: boolean;
}

export type ChatMessageType = 'chat' | 'system' | 'guess_correct' | 'guess_close';

export interface ChatMessage {
  id: string;
  senderId?: string;
  senderName: string;
  text: string;
  timestamp: number;
  type: ChatMessageType;
  targetBoard?: '1' | '2';
}

export type GameId = 'skribbl' | 'skribbl_duel' | 'word_fortune' | 'mystery_reveal' | 'gartic' | 'word_imposter' | 'quiz_kbc';

export interface RoomSettings {
  roundTime: number;
  totalRounds: number;
  maxPlayers: number;

  // Doodle Dash (Skribbl) specific
  doodleWordCount: number; // 2, 3, 4, 5
  doodleHintCount: number; // 0, 1, 2
  doodleCustomWords: string; // comma-separated custom words
  doodleCustomOnly: boolean;
  doodleAllowCustomInput?: boolean; // allow drawer to enter their own word

  // Telephone Tale (Gartic) specific
  garticWriteTime: number; // 30, 45, 60
  garticDrawTime: number; // 60, 75, 90, 120
  garticGuessTime: number; // 20, 30, 45

  // Duo Duel specific
  duelTime: number; // 45, 60, 75, 90

  // Shadow Reveal specific
  shadowPrepTime: number; // 45, 60, 90, 120, 180, 240
  shadowGuessTime: number; // 45, 60, 75, 90, 120
  shadowBgColor: string; // hex color e.g. '#ffffff'

  // KBC Quiz specific
  quizCategory?: string; // 'All' | 'Geography' | 'Science' | 'History' | 'Math' | 'Sports' | 'Art' | 'Tech'
  quizDifficulty?: 'progressive' | 'easy' | 'medium' | 'hard' | 'mixed';
}

export interface DrawStroke {
  color: string;
  size: number;
  opacity?: number;
  points: { x: number; y: number }[]; // 0..1
}

export type DrawCommand = 
  | { type: 'stroke'; stroke: DrawStroke; canvasId?: '1' | '2' }
  | { type: 'clear'; canvasId?: '1' | '2' }
  | { type: 'fill'; color: string; canvasId?: '1' | '2' }
  | { type: 'lasso'; points: { x: number; y: number }[]; color: string; canvasId?: '1' | '2' };

// --- 1. Skribbl & Duo Duel State ---
export interface SkribblGameState {
  mode: 'classic' | 'duel';
  phase: 'word_select' | 'drawing' | 'round_recap' | 'game_over';
  currentRound: number;
  totalRounds: number;
  currentDrawerId: string;
  drawer1Id?: string;
  drawer2Id?: string;
  drawer1Vote?: string;
  drawer2Vote?: string;
  duelDecidingWords?: [string, string];
  duelWinnerId?: string;
  board1Guessed?: boolean;
  board2Guessed?: boolean;
  secretWord: string;
  revealedWord: string;
  wordChoices: string[];
  timer: number;
  guessedPlayerIds: string[];
  canvasHistory: DrawCommand[];
  canvasHistory2?: DrawCommand[];
}

// --- 2. Word Fortune State ---
export interface FortuneGameState {
  phase: 'phrase_select' | 'guessing' | 'round_recap' | 'game_over';
  currentRound: number;
  totalRounds: number;
  puzzleCreatorId: string;
  category: string;
  language?: string;
  secretPhrase: string;
  revealedPhrase: string;
  guessedLetters: string[];
  wrongLetters: string[];
  currentTurnPlayerId: string;
  turnTimer: number;
  guesserOrder: string[];
  usedTurnPlayerIds: string[];
  timer: number;
  solvedByPlayerId?: string;
  first30Contributors: Record<string, number>;
  first70Contributors: Record<string, number>;
  allCorrectGuessers: Record<string, number>;
  lastGuessFeedback?: { letter: string; hit: boolean; points: number; playerName: string; stage?: string };
}

// --- 3. Mystery Reveal State (Simultaneous Prep & Sequential Showcase) ---
export interface PlayerShadowItem {
  playerId: string;
  playerName: string;
  answer: string;
  category: string;
  imageUrl: string;
  blackoutDataUrl?: string;
  bgColor: string;
  isReady: boolean;
}

export interface MysteryGameState {
  phase: 'prep' | 'showcase' | 'showcase_reveal' | 'game_over';
  prepTimer: number;
  currentRound: number;
  totalRounds: number;
  playerShadows: Record<string, PlayerShadowItem>;
  showcasePlayerIds: string[];
  showcaseIndex: number;
  // Active showcase item currently being guessed
  creatorId: string;
  targetAnswer: string;
  revealedAnswer: string;
  category: string;
  imageUrl: string;
  blackoutDataUrl?: string;
  bgColor: string;
  filterMode: 'silhouette' | 'tiles' | 'custom_blackout';
  revealedTiles: number[];
  timer: number;
  guessedPlayerIds: string[];
}

// --- 4. Gartic Phone (Telephone Tale) State ---
export type GarticStep =
  | { type: 'prompt'; authorId: string; authorName: string; text: string }
  | { type: 'drawing'; authorId: string; authorName: string; drawingCommands: DrawCommand[] };

export interface GarticChain {
  originalAuthorId: string;
  originalAuthorName: string;
  steps: GarticStep[];
}

export interface GarticGameState {
  phase: 'writing' | 'drawing' | 'guessing' | 'presentation' | 'game_over';
  roundNumber: number;
  totalRounds: number;
  timer: number;
  chains: Record<string, GarticChain>;
  submittedPlayerIds: string[];
  presentationChainIndex: number;
  presentationStepIndex: number;
}

// --- 5. Word Imposter State ---
export interface ImposterGameState {
  phase: 'clue_giving' | 'voting' | 'reveal' | 'imposter_guess' | 'round_recap' | 'game_over';
  currentRound: number;
  totalRounds: number;
  imposterId: string;
  secretWord: string;
  imposterWord: string;
  clues: Array<{ playerId: string; playerName: string; clue: string }>;
  currentSpeakerId: string;
  speakerOrder: string[];
  submittedClueIds: string[];
  votes: Record<string, string>; // voterId -> suspectId
  voteHistory?: Record<string, string>; // persisted for reveal breakdown
  strikes: Record<string, number>; // playerId -> count of wrong votes
  eliminatedPlayerIds: string[];  // players eliminated by strikes
  timer: number;
  roundWinner?: 'crew' | 'imposter';
  imposterGuess?: string;
  imposterGuessCorrect?: boolean;
}

// --- 6. Quiz KBC State ---
export type QuizLifeline = 'fifty_fifty' | 'audience_poll' | 'skip' | 'double_dip';

export interface QuizQuestion {
  id: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct: 'A' | 'B' | 'C' | 'D';
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

export interface QuizGameState {
  phase: 'question' | 'reveal' | 'game_over';
  currentQuestion: number;    // 0-14
  totalQuestions: number;     // 15
  question: QuizQuestion;     // correct answer stripped before sending to non-reveal clients
  timer: number;
  // Hidden from clients until reveal (sent as hasLocked map only)
  lockedAnswers: Record<string, string>;       // playerId -> 'A'|'B'|'C'|'D'
  doubleSecondAnswers: Record<string, string>; // playerId -> second answer (double dip)
  hasLocked: Record<string, boolean>;          // sent to all clients so they see who locked
  usedLifelines: Record<string, QuizLifeline[]>;
  eliminatedOptions: Record<string, ('A' | 'B' | 'C' | 'D')[]>; // per-player 50:50
  audiencePolls?: Record<string, Record<string, number>>; // per-player audience poll
  audiencePoll?: Record<string, number>; // current player's audience poll (sent in sync)
  prizeValues: number[];     // fixed or ladder values (e.g. 10000 each)
  safeHavens: number[];      // [4, 9] question indices
  playerHistory?: Record<string, boolean[]>; // playerId -> per-question isCorrect status
  correctReveal?: 'A' | 'B' | 'C' | 'D'; // only present in reveal phase
  answerSummary?: Record<string, { answer: string; isCorrect: boolean; points: number }>; // reveal phase breakdown
}

export interface RoomState {
  code: string;
  hostId: string;
  status: 'lobby' | 'playing' | 'game_over';
  selectedGameId: GameId;
  players: Record<string, Player>;
  chat: ChatMessage[];
  settings: RoomSettings;
  skribblState?: Omit<SkribblGameState, 'secretWord'> & { secretWord?: string };
  fortuneState?: Omit<FortuneGameState, 'secretPhrase'> & { secretPhrase?: string };
  mysteryState?: Omit<MysteryGameState, 'targetAnswer'> & { targetAnswer?: string };
  garticState?: GarticGameState;
  imposterState?: Omit<ImposterGameState, 'secretWord' | 'imposterWord'> & { secretWord?: string; imposterWord?: string };
  quizState?: Omit<QuizGameState, 'lockedAnswers' | 'doubleSecondAnswers'> & { lockedAnswers?: Record<string, string>; doubleSecondAnswers?: Record<string, string> };
}

// Client -> Server messages
export type ClientMessage =
  | { type: 'JOIN_ROOM'; name: string; avatar: string }
  | { type: 'UPDATE_PROFILE'; name?: string; avatar?: string }
  | { type: 'TOGGLE_READY' }
  | { type: 'SELECT_GAME'; gameId: GameId }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<RoomSettings> }
  | { type: 'START_GAME' }
  | { type: 'RETURN_TO_LOBBY' }
  | { type: 'HOST_SKIP_TIMER' }
  | { type: 'SEND_CHAT'; text: string; targetBoard?: '1' | '2' }
  // Skribbl & Duel
  | { type: 'SKRIBBL_CHOOSE_WORD'; word: string }
  | { type: 'SKRIBBL_DRAW_COMMAND'; command: DrawCommand }
  // Fortune
  | { type: 'FORTUNE_SET_PHRASE'; phrase: string; category: string; language?: string }
  | { type: 'FORTUNE_GUESS_LETTER'; letter: string }
  // Mystery (Multiplayer Prep & Showcase)
  | { type: 'MYSTERY_SUBMIT_PREP'; answer: string; category: string; imageUrl: string; blackoutDataUrl?: string; bgColor: string }
  | { type: 'MYSTERY_SET_IMAGE'; imageUrl: string; answer: string; category: string; filterMode: 'silhouette' | 'tiles' | 'custom_blackout'; blackoutDataUrl?: string; bgColor?: string }
  | { type: 'MYSTERY_REVEAL_TILE'; tileIndex: number }
  | { type: 'MYSTERY_NEXT_SHOWCASE' }
  // Gartic Phone
  | { type: 'GARTIC_SUBMIT_PROMPT'; text: string }
  | { type: 'GARTIC_SUBMIT_DRAWING'; commands: DrawCommand[] }
  | { type: 'GARTIC_SUBMIT_GUESS'; text: string }
  | { type: 'GARTIC_NEXT_PRESENTATION_STEP' }
  | { type: 'GARTIC_PREV_PRESENTATION_STEP' }
  | { type: 'GARTIC_SELECT_PRESENTATION_CHAIN'; chainIndex: number }
  | { type: 'GARTIC_SELECT_PRESENTATION_STEP'; stepIndex: number }
  // Word Imposter
  | { type: 'IMPOSTER_SUBMIT_CLUE'; clue: string }
  | { type: 'IMPOSTER_VOTE'; suspectId: string }
  | { type: 'IMPOSTER_GUESS_WORD'; guess: string }
  // Quiz KBC
  | { type: 'QUIZ_LOCK_ANSWER'; answer: string; isDouble?: boolean }
  | { type: 'QUIZ_USE_LIFELINE'; lifeline: QuizLifeline };

// Server -> Client messages
export type ServerMessage =
  | { type: 'SYNC_STATE'; state: RoomState }
  | { type: 'CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'SKRIBBL_DRAW_COMMAND'; command: DrawCommand }
  | { type: 'ERROR'; message: string };
