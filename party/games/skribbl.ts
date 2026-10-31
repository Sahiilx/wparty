import { RoomState, SkribblGameState, DrawCommand, Player } from '../types';
import { getRandomWords, maskWord, isCloseGuess, DEFAULT_WORDS } from '../words/default-words';

export class SkribblEngine {
  static getWordChoices(roomState: RoomState, count: number = 3): string[] {
    const s = roomState.settings;
    let pool: string[] = [];

    if (s.doodleCustomWords && s.doodleCustomWords.trim()) {
      const customList = s.doodleCustomWords
        .split(',')
        .map(w => w.trim())
        .filter(w => w.length > 1);
      if (s.doodleCustomOnly && customList.length > 0) {
        pool = customList;
      } else {
        pool = [...customList, ...DEFAULT_WORDS];
      }
    } else {
      pool = DEFAULT_WORDS;
    }

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  static initGame(roomState: RoomState, mode: 'classic' | 'duel' = 'classic'): void {
    const playerIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
    if (playerIds.length === 0) return;

    for (const id of playerIds) {
      roomState.players[id].score = 0;
    }

    const drawer1 = playerIds[0];
    const drawer2 = playerIds.length > 1 ? playerIds[1] : playerIds[0];
    const choices = this.getWordChoices(roomState, roomState.settings.doodleWordCount || 3);

    const roundDuration = mode === 'duel'
      ? (roomState.settings.duelTime || 60)
      : (roomState.settings.roundTime || 75);

    roomState.skribblState = {
      mode,
      phase: 'word_select',
      currentRound: 1,
      totalRounds: roomState.settings.totalRounds || 3,
      currentDrawerId: drawer1,
      drawer1Id: drawer1,
      drawer2Id: drawer2,
      board1Guessed: false,
      board2Guessed: false,
      secretWord: '',
      revealedWord: 'Choosing word...',
      wordChoices: choices,
      timer: 15,
      guessedPlayerIds: [],
      canvasHistory: [],
      canvasHistory2: [],
    };
    roomState.status = 'playing';
  }

  static selectWord(roomState: RoomState, playerId: string, word: string): boolean {
    const s = roomState.skribblState;
    if (!s || s.phase !== 'word_select') return false;

    const cleanWord = word.trim().toLowerCase();
    if (!cleanWord) return false;

    if (s.mode === 'duel') {
      if (playerId === s.drawer1Id) {
        s.drawer1Vote = cleanWord;
      } else if (playerId === s.drawer2Id) {
        s.drawer2Vote = cleanWord;
      } else {
        return false;
      }

      // Check if both have voted
      if (s.drawer1Vote && s.drawer2Vote) {
        if (s.drawer1Vote === s.drawer2Vote) {
          // Both voted the exact same word!
          s.secretWord = s.drawer1Vote;
          s.revealedWord = maskWord(s.secretWord);
          s.wordChoices = [];
          s.phase = 'drawing';
          s.timer = roomState.settings.duelTime || 60;
          s.canvasHistory = [];
          s.canvasHistory2 = [];
          s.guessedPlayerIds = [];
          s.board1Guessed = false;
          s.board2Guessed = false;
          delete s.duelWinnerId;
          delete s.duelDecidingWords;
        } else {
          // Both voted different words -> trigger coin flip animation countdown!
          s.duelDecidingWords = [s.drawer1Vote, s.drawer2Vote];
          s.timer = 4; // 4 seconds animation on client
        }
      }
      return true;
    }

    if (s.currentDrawerId !== playerId) return false;

    s.secretWord = cleanWord;
    s.revealedWord = maskWord(s.secretWord);
    s.wordChoices = [];
    s.phase = 'drawing';
    s.timer = roomState.settings.roundTime || 75;
    s.canvasHistory = [];
    s.canvasHistory2 = [];
    s.guessedPlayerIds = [];
    s.board1Guessed = false;
    s.board2Guessed = false;
    delete s.duelWinnerId;
    return true;
  }

  static addDrawCommand(roomState: RoomState, playerId: string, cmd: DrawCommand): boolean {
    const s = roomState.skribblState;
    if (!s || s.phase !== 'drawing') return false;

    if (s.mode === 'duel') {
      if (playerId === s.drawer1Id) {
        cmd.canvasId = '1';
        if (cmd.type === 'clear') {
          s.canvasHistory = [];
        } else {
          s.canvasHistory.push(cmd);
        }
        return true;
      } else if (playerId === s.drawer2Id) {
        cmd.canvasId = '2';
        if (!s.canvasHistory2) s.canvasHistory2 = [];
        if (cmd.type === 'clear') {
          s.canvasHistory2 = [];
        } else {
          s.canvasHistory2.push(cmd);
        }
        return true;
      }
      return false;
    }

    if (s.currentDrawerId !== playerId) return false;
    cmd.canvasId = '1';
    if (cmd.type === 'clear') {
      s.canvasHistory = [];
    } else {
      s.canvasHistory.push(cmd);
    }
    return true;
  }

  static checkGuess(
    roomState: RoomState,
    playerId: string,
    guess: string,
    targetBoard?: '1' | '2'
  ): { isMatch: boolean; isClose: boolean; points: number; awardedDrawerId?: string } {
    const s = roomState.skribblState;
    if (!s || s.phase !== 'drawing' || !s.secretWord) {
      return { isMatch: false, isClose: false, points: 0 };
    }

    // Drawers cannot guess
    if (s.mode === 'duel') {
      if (playerId === s.drawer1Id || playerId === s.drawer2Id) {
        return { isMatch: false, isClose: false, points: 0 };
      }
    } else {
      if (s.currentDrawerId === playerId) {
        return { isMatch: false, isClose: false, points: 0 };
      }
    }

    if (s.guessedPlayerIds.includes(playerId)) {
      return { isMatch: false, isClose: false, points: 0 };
    }

    const cleanGuess = guess.trim().toLowerCase();
    if (cleanGuess === s.secretWord) {
      s.guessedPlayerIds.push(playerId);

      const maxPoints = 500;
      const roundTime = s.mode === 'duel' ? (roomState.settings.duelTime || 60) : (roomState.settings.roundTime || 75);
      const points = Math.max(100, Math.round((s.timer / roundTime) * maxPoints));
      roomState.players[playerId].score += points;

      let awardedDrawerId: string | undefined = undefined;

      if (s.mode === 'duel') {
        const board = targetBoard || '1';
        if (board === '1' && s.drawer1Id) {
          s.board1Guessed = true;
          awardedDrawerId = s.drawer1Id;
          if (roomState.players[s.drawer1Id]) {
            roomState.players[s.drawer1Id].score += 200;
          }
        } else if (board === '2' && s.drawer2Id) {
          s.board2Guessed = true;
          awardedDrawerId = s.drawer2Id;
          if (roomState.players[s.drawer2Id]) {
            roomState.players[s.drawer2Id].score += 200;
          }
        }

        // Duel champion bonus to whichever board was guessed first!
        if (!s.duelWinnerId && awardedDrawerId) {
          s.duelWinnerId = awardedDrawerId;
          if (roomState.players[awardedDrawerId]) {
            roomState.players[awardedDrawerId].score += 150; // extra champion bonus!
          }
        }

        // If both boards guessed, end round
        if (s.board1Guessed && s.board2Guessed) {
          s.timer = 0;
        }
      } else {
        // Classic mode
        const drawer = roomState.players[s.currentDrawerId];
        if (drawer) {
          drawer.score += 75;
          awardedDrawerId = s.currentDrawerId;
        }
      }

      // Check if all audience members guessed
      const guesserCount = Object.keys(roomState.players).filter(id => {
        if (!roomState.players[id].isConnected) return false;
        if (s.mode === 'duel') {
          return id !== s.drawer1Id && id !== s.drawer2Id;
        }
        return id !== s.currentDrawerId;
      }).length;

      if (s.guessedPlayerIds.length >= guesserCount && guesserCount > 0) {
        s.timer = 0;
      }

      return { isMatch: true, isClose: false, points, awardedDrawerId };
    }

    if (isCloseGuess(cleanGuess, s.secretWord)) {
      return { isMatch: false, isClose: true, points: 0 };
    }

    return { isMatch: false, isClose: false, points: 0 };
  }

  static tick(roomState: RoomState): { phaseChanged: boolean } {
    const s = roomState.skribblState;
    if (!s || roomState.status !== 'playing') return { phaseChanged: false };

    s.timer = Math.max(0, s.timer - 1);

    if (s.phase === 'word_select') {
      if (s.duelDecidingWords) {
        if (s.timer <= 0) {
          const picked = Math.random() < 0.5 ? s.duelDecidingWords[0] : s.duelDecidingWords[1];
          s.secretWord = picked;
          s.revealedWord = maskWord(picked);
          s.wordChoices = [];
          delete s.duelDecidingWords;
          s.phase = 'drawing';
          s.timer = roomState.settings.duelTime || 60;
          s.canvasHistory = [];
          s.canvasHistory2 = [];
          s.guessedPlayerIds = [];
          s.board1Guessed = false;
          s.board2Guessed = false;
          delete s.duelWinnerId;
          return { phaseChanged: true };
        }
        return { phaseChanged: false };
      }

      if (s.timer <= 0) {
        if (s.mode === 'duel') {
          const vote = s.drawer1Vote || s.drawer2Vote || s.wordChoices[0] || 'rocket';
          s.secretWord = vote;
          s.revealedWord = maskWord(vote);
          s.wordChoices = [];
          s.phase = 'drawing';
          s.timer = roomState.settings.duelTime || 60;
          s.canvasHistory = [];
          s.canvasHistory2 = [];
          s.guessedPlayerIds = [];
          s.board1Guessed = false;
          s.board2Guessed = false;
          delete s.duelWinnerId;
          delete s.drawer1Vote;
          delete s.drawer2Vote;
          delete s.duelDecidingWords;
          return { phaseChanged: true };
        } else {
          const word = s.wordChoices[0] || 'rocket';
          this.selectWord(roomState, s.drawer1Id || s.currentDrawerId, word);
          return { phaseChanged: true };
        }
      }
      return { phaseChanged: false };
    }

    if (s.phase === 'drawing') {
      if (s.timer <= 0) {
        s.phase = 'round_recap';
        s.revealedWord = (s.secretWord || '').toUpperCase();
        s.timer = 6;
        return { phaseChanged: true };
      }
      return { phaseChanged: false };
    }

    if (s.phase === 'round_recap') {
      if (s.timer <= 0) {
        const playerIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
        if (playerIds.length === 0) {
          roomState.status = 'lobby';
          return { phaseChanged: true };
        }

        if (s.mode === 'duel') {
          let d1Idx = playerIds.indexOf(s.drawer1Id || '');
          let d2Idx = playerIds.indexOf(s.drawer2Id || '');

          let nextD1 = (d1Idx + 2) % playerIds.length;
          let nextD2 = (d2Idx + 2) % playerIds.length;
          if (nextD1 === nextD2 && playerIds.length > 1) {
            nextD2 = (nextD1 + 1) % playerIds.length;
          }

          if (s.currentRound >= s.totalRounds) {
            s.phase = 'game_over';
            roomState.status = 'game_over';
            s.timer = 10;
            return { phaseChanged: true };
          }

          s.currentRound += 1;
          s.drawer1Id = playerIds[nextD1];
          s.drawer2Id = playerIds[nextD2] || playerIds[nextD1];
          s.currentDrawerId = s.drawer1Id;
        } else {
          const currentIndex = playerIds.indexOf(s.currentDrawerId);
          const nextIndex = currentIndex + 1;

          if (nextIndex >= playerIds.length) {
            if (s.currentRound >= s.totalRounds) {
              s.phase = 'game_over';
              roomState.status = 'game_over';
              s.timer = 10;
              return { phaseChanged: true };
            } else {
              s.currentRound += 1;
              s.currentDrawerId = playerIds[0];
            }
          } else {
            s.currentDrawerId = playerIds[nextIndex];
          }
        }

        s.phase = 'word_select';
        s.secretWord = '';
        s.revealedWord = 'Choosing word...';
        s.wordChoices = this.getWordChoices(roomState, roomState.settings.doodleWordCount || 3);
        s.timer = 15;
        s.guessedPlayerIds = [];
        s.canvasHistory = [];
        s.canvasHistory2 = [];
        s.board1Guessed = false;
        s.board2Guessed = false;
        delete s.duelWinnerId;
        delete s.drawer1Vote;
        delete s.drawer2Vote;
        delete s.duelDecidingWords;
        return { phaseChanged: true };
      }
      return { phaseChanged: false };
    }

    return { phaseChanged: false };
  }
}
