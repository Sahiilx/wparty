import { RoomState, FortuneGameState } from '../types';
import { getRandomPhrase } from '../words/massive-phrases';
import { maskPhrase } from '../words/fortune-phrases';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Returns percent of non-space letters already revealed (0-100) */
function revealPercent(phrase: string, guessedLetters: string[]): number {
  const letters = phrase.toUpperCase().split('').filter(c => c >= 'A' && c <= 'Z');
  if (letters.length === 0) return 100;
  const revealed = letters.filter(c => guessedLetters.includes(c)).length;
  return (revealed / letters.length) * 100;
}

/** Points based on how revealed the phrase was BEFORE this guess */
function stagePoints(pct: number): { points: number; stage: string } {
  if (pct < 10) return { points: 100, stage: '🔥 First 10%! Max points!' };
  if (pct < 30) return { points: 80,  stage: '⭐ Early bird! Great points!' };
  if (pct < 60) return { points: 60,  stage: '👍 Decent timing!' };
  if (pct < 99) return { points: 40,  stage: '⏱️ Late guess' };
  return { points: 20, stage: '😅 Almost solved!' };
}

export class FortuneEngine {
  static initGame(roomState: RoomState): void {
    const playerIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
    if (playerIds.length === 0) return;

    for (const id of playerIds) {
      roomState.players[id].score = 0;
    }

    const firstCreatorId = playerIds[0];
    const preset = getRandomPhrase();

    const guessers = playerIds.filter(id => id !== firstCreatorId);
    const guesserOrder = shuffle(guessers);

    roomState.fortuneState = {
      phase: 'phrase_select',
      currentRound: 1,
      totalRounds: roomState.settings.totalRounds || 3,
      puzzleCreatorId: firstCreatorId,
      category: preset.category,
      language: preset.language,
      secretPhrase: preset.phrase,
      revealedPhrase: maskPhrase(preset.phrase, []),
      guessedLetters: [],
      wrongLetters: [],
      currentTurnPlayerId: guesserOrder[0] ?? firstCreatorId,
      turnTimer: 0,
      guesserOrder,
      usedTurnPlayerIds: [],
      timer: 25,
      first30Contributors: {},
      first70Contributors: {},
      allCorrectGuessers: {},
    };
    roomState.status = 'playing';
  }

  static setPhrase(
    roomState: RoomState,
    playerId: string,
    phrase: string,
    category: string,
    language?: string
  ): boolean {
    const f = roomState.fortuneState;
    if (!f || f.phase !== 'phrase_select' || f.puzzleCreatorId !== playerId) return false;

    const cleanPhrase = phrase.trim().toUpperCase().slice(0, 50);
    if (!cleanPhrase) return false;

    const playerIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
    const guessers = playerIds.filter(id => id !== playerId);
    const guesserOrder = shuffle(guessers);

    f.secretPhrase = cleanPhrase;
    f.category = category.trim().slice(0, 40) || 'Mystery Category';
    if (language) f.language = language;
    f.revealedPhrase = maskPhrase(cleanPhrase, []);
    f.guessedLetters = [];
    f.wrongLetters = [];
    f.guesserOrder = guesserOrder;
    f.usedTurnPlayerIds = [];
    f.currentTurnPlayerId = guesserOrder[0] ?? playerId;
    f.first30Contributors = {};
    f.first70Contributors = {};
    f.allCorrectGuessers = {};
    f.phase = 'guessing';
    f.timer = roomState.settings.roundTime || 90;
    delete f.solvedByPlayerId;
    delete f.lastGuessFeedback;
    return true;
  }

  static refreshPhrase(roomState: RoomState, language?: string): boolean {
    const f = roomState.fortuneState;
    if (!f || f.phase !== 'phrase_select') return false;

    const preset = getRandomPhrase(language as 'English' | 'Hinglish' | 'French' | 'Spanish' | undefined);
    f.secretPhrase = preset.phrase;
    f.category = preset.category;
    f.language = preset.language;
    f.revealedPhrase = maskPhrase(preset.phrase, []);
    return true;
  }

  static guessLetter(
    roomState: RoomState,
    playerId: string,
    rawLetter: string
  ): { isHit: boolean; count: number; points: number; stage?: string } {
    const f = roomState.fortuneState;
    if (!f || f.phase !== 'guessing' || !f.secretPhrase) {
      return { isHit: false, count: 0, points: 0 };
    }

    // Must be player's turn
    if (f.currentTurnPlayerId !== playerId) {
      return { isHit: false, count: 0, points: 0 };
    }

    // Creator cannot guess their own puzzle
    if (f.puzzleCreatorId === playerId) {
      return { isHit: false, count: 0, points: 0 };
    }

    // Already used turn
    if (f.usedTurnPlayerIds.includes(playerId)) {
      return { isHit: false, count: 0, points: 0 };
    }

    const letter = rawLetter.trim().toUpperCase().charAt(0);
    if (letter < 'A' || letter > 'Z') return { isHit: false, count: 0, points: 0 };

    if (f.guessedLetters.includes(letter) || f.wrongLetters.includes(letter)) {
      return { isHit: false, count: 0, points: 0 };
    }

    // Mark turn as used
    f.usedTurnPlayerIds.push(playerId);

    const phraseUpper = f.secretPhrase.toUpperCase();
    let count = 0;
    for (let i = 0; i < phraseUpper.length; i++) {
      if (phraseUpper[i] === letter) count++;
    }

    const playerIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);

    if (count > 0) {
      // Calculate reveal% BEFORE adding this letter
      const pctBefore = revealPercent(f.secretPhrase, f.guessedLetters);
      const { points, stage } = stagePoints(pctBefore);

      f.guessedLetters.push(letter);
      f.revealedPhrase = maskPhrase(f.secretPhrase, f.guessedLetters);

      if (roomState.players[playerId]) {
        roomState.players[playerId].score += points;
      }

      // Track contributor stages
      if (pctBefore < 30) {
        f.first30Contributors[playerId] = (f.first30Contributors[playerId] ?? 0) + 1;
      }
      if (pctBefore < 70) {
        f.first70Contributors[playerId] = (f.first70Contributors[playerId] ?? 0) + 1;
      }
      f.allCorrectGuessers[playerId] = (f.allCorrectGuessers[playerId] ?? 0) + 1;

      const playerName = roomState.players[playerId]?.name ?? 'Player';
      f.lastGuessFeedback = { letter, hit: true, points, playerName, stage };

      // Check if completely solved by letters
      if (!f.revealedPhrase.includes('_')) {
        f.phase = 'round_recap';
        f.solvedByPlayerId = playerId;
        f.timer = 8;
        return { isHit: true, count, points, stage };
      }

      // Advance turn
      FortuneEngine.advanceTurn(roomState, playerIds);
      return { isHit: true, count, points, stage };
    } else {
      f.wrongLetters.push(letter);
      const playerName = roomState.players[playerId]?.name ?? 'Player';
      f.lastGuessFeedback = { letter, hit: false, points: 0, playerName };

      // Advance turn even on miss
      FortuneEngine.advanceTurn(roomState, playerIds);
      return { isHit: false, count: 0, points: 0 };
    }
  }

  static checkSolve(
    roomState: RoomState,
    playerId: string,
    guess: string
  ): { isMatch: boolean; points: number; penalty: number; isAttempt: boolean } {
    const f = roomState.fortuneState;
    if (!f || f.phase !== 'guessing' || !f.secretPhrase) {
      return { isMatch: false, points: 0, penalty: 0, isAttempt: false };
    }
    if (f.puzzleCreatorId === playerId) {
      return { isMatch: false, points: 0, penalty: 0, isAttempt: false };
    }

    const cleanGuess = guess.trim().toUpperCase().replace(/[^A-Z]/g, '');
    const cleanSecret = f.secretPhrase.toUpperCase().replace(/[^A-Z]/g, '');

    // An attempt to solve has >= 3 letters or is roughly of similar length
    const isAttempt = cleanGuess.length >= 3 && Math.abs(cleanGuess.length - cleanSecret.length) <= 5;
    if (!isAttempt && cleanGuess !== cleanSecret) {
      return { isMatch: false, points: 0, penalty: 0, isAttempt: false };
    }

    if (cleanGuess === cleanSecret) {
      const pct = revealPercent(f.secretPhrase, f.guessedLetters);
      // <= 10% completed -> 500 pts; each additional 10% completed reduces points by 5% (25 pts)
      const deductionSteps = Math.max(0, Math.floor((pct - 10) / 10) + (pct > 10 ? 1 : 0));
      const points = Math.max(100, Math.round(500 - (deductionSteps * 25)));

      if (roomState.players[playerId]) {
        roomState.players[playerId].score += points;
      }

      // Bonus points to contributors:
      // Users who guessed in first 30% get 100 bonus pts
      // Users who guessed in first 70% get 90 bonus pts
      // Other correct letter guessers get 80 bonus pts
      for (const [cid, p] of Object.entries(roomState.players)) {
        if (cid === playerId) continue; // solver already got solve points
        if (f.first30Contributors[cid]) {
          p.score += 100;
        } else if (f.first70Contributors[cid]) {
          p.score += 90;
        } else if (f.allCorrectGuessers[cid]) {
          p.score += 80;
        }
      }

      f.revealedPhrase = f.secretPhrase.toUpperCase();
      f.phase = 'round_recap';
      f.solvedByPlayerId = playerId;
      f.timer = 8;
      return { isMatch: true, points, penalty: 0, isAttempt: true };
    }

    // Wrong solve guess -> deduct penalty
    const penalty = 50;
    if (roomState.players[playerId]) {
      roomState.players[playerId].score = Math.max(0, roomState.players[playerId].score - penalty);
    }
    return { isMatch: false, points: 0, penalty, isAttempt: true };
  }

  /** Advances turn to next player; when round of turns completes, resets used turns so players keep rotating until timer runs out or puzzle is solved */
  private static advanceTurn(roomState: RoomState, playerIds: string[]): void {
    const f = roomState.fortuneState;
    if (!f) return;

    // Filter connected guessers
    const connectedGuessers = f.guesserOrder.filter(id => playerIds.includes(id));
    if (connectedGuessers.length === 0) {
      f.phase = 'round_recap';
      f.timer = 8;
      return;
    }

    let remaining = connectedGuessers.filter(id => !f.usedTurnPlayerIds.includes(id));
    if (remaining.length === 0) {
      // Loop rotation: reset used turns so another round of guesses can occur
      f.usedTurnPlayerIds = [];
      remaining = connectedGuessers;
    }

    const currentIdx = connectedGuessers.indexOf(f.currentTurnPlayerId);
    const nextIdx = (currentIdx + 1) % connectedGuessers.length;
    f.currentTurnPlayerId = connectedGuessers[nextIdx] ?? connectedGuessers[0];
  }

  static tick(roomState: RoomState): { phaseChanged: boolean } {
    const f = roomState.fortuneState;
    if (!f || roomState.status !== 'playing') return { phaseChanged: false };

    f.timer = Math.max(0, f.timer - 1);

    if (f.phase === 'phrase_select') {
      if (f.timer <= 0) {
        // Auto-start with preset phrase
        const playerIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
        const guessers = playerIds.filter(id => id !== f.puzzleCreatorId);
        f.guesserOrder = shuffle(guessers);
        f.usedTurnPlayerIds = [];
        f.currentTurnPlayerId = f.guesserOrder[0] ?? f.puzzleCreatorId;
        f.guessedLetters = [];
        f.wrongLetters = [];
        f.first30Contributors = {};
        f.first70Contributors = {};
        f.allCorrectGuessers = {};
        f.phase = 'guessing';
        f.timer = roomState.settings.roundTime || 90;
        delete f.lastGuessFeedback;
        return { phaseChanged: true };
      }
      return { phaseChanged: false };
    }

    if (f.phase === 'guessing') {
      if (f.timer <= 0) {
        f.phase = 'round_recap';
        f.revealedPhrase = (f.secretPhrase || '').toUpperCase();
        f.timer = 8;
        return { phaseChanged: true };
      }
      return { phaseChanged: false };
    }

    if (f.phase === 'round_recap') {
      if (f.timer <= 0) {
        const playerIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
        if (playerIds.length === 0) {
          roomState.status = 'lobby';
          return { phaseChanged: true };
        }

        const currIndex = playerIds.indexOf(f.puzzleCreatorId);
        const nextIndex = currIndex + 1;

        if (nextIndex >= playerIds.length) {
          if (f.currentRound >= f.totalRounds) {
            f.phase = 'game_over';
            roomState.status = 'game_over';
            f.timer = 12;
            return { phaseChanged: true };
          } else {
            f.currentRound += 1;
            f.puzzleCreatorId = playerIds[0];
          }
        } else {
          f.puzzleCreatorId = playerIds[nextIndex];
        }

        const preset = getRandomPhrase();
        const guessers = playerIds.filter(id => id !== f.puzzleCreatorId);
        f.guesserOrder = shuffle(guessers);
        f.usedTurnPlayerIds = [];
        f.phase = 'phrase_select';
        f.category = preset.category;
        f.language = preset.language;
        f.secretPhrase = preset.phrase;
        f.revealedPhrase = maskPhrase(preset.phrase, []);
        f.guessedLetters = [];
        f.wrongLetters = [];
        f.currentTurnPlayerId = f.guesserOrder[0] ?? f.puzzleCreatorId;
        f.first30Contributors = {};
        f.first70Contributors = {};
        f.allCorrectGuessers = {};
        f.timer = 25;
        delete f.solvedByPlayerId;
        delete f.lastGuessFeedback;
        return { phaseChanged: true };
      }
      return { phaseChanged: false };
    }

    return { phaseChanged: false };
  }
}
