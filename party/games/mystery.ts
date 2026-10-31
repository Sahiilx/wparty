import { RoomState, MysteryGameState, PlayerShadowItem } from '../types';
import { isCloseGuess } from '../words/default-words';
import { MYSTERY_PRESETS } from '../words/mystery-presets';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function maskAnswer(answer: string): string {
  return answer.split('').map(c => c === ' ' ? ' ' : '_').join(' ');
}

export class MysteryEngine {
  static initGame(roomState: RoomState): void {
    const playerIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
    if (playerIds.length === 0) return;

    for (const id of playerIds) {
      roomState.players[id].score = 0;
    }

    const prepTime = roomState.settings.shadowPrepTime || 120;

    // Initialize empty shadow slots for each player
    const playerShadows: Record<string, PlayerShadowItem> = {};
    for (const id of playerIds) {
      playerShadows[id] = {
        playerId: id,
        playerName: roomState.players[id].name,
        answer: '',
        category: '',
        imageUrl: '',
        bgColor: roomState.settings.shadowBgColor || '#ffffff',
        isReady: false,
      };
    }

    roomState.mysteryState = {
      phase: 'prep',
      prepTimer: prepTime,
      currentRound: 1,
      totalRounds: roomState.settings.totalRounds || 3,
      playerShadows,
      showcasePlayerIds: [],
      showcaseIndex: 0,
      creatorId: '',
      targetAnswer: '',
      revealedAnswer: '',
      category: '',
      imageUrl: '',
      bgColor: roomState.settings.shadowBgColor || '#ffffff',
      filterMode: 'custom_blackout',
      revealedTiles: [],
      timer: prepTime,
      guessedPlayerIds: [],
    };
    roomState.status = 'playing';
  }

  static submitPrep(
    roomState: RoomState,
    playerId: string,
    item: { answer: string; category: string; imageUrl: string; blackoutDataUrl?: string; bgColor: string }
  ): boolean {
    const m = roomState.mysteryState;
    if (!m || m.phase !== 'prep') return false;
    if (!m.playerShadows[playerId]) return false;

    const cleanAnswer = item.answer.trim();
    if (!cleanAnswer || !item.imageUrl) return false;

    m.playerShadows[playerId] = {
      ...m.playerShadows[playerId],
      answer: cleanAnswer,
      category: item.category.trim().slice(0, 40) || 'Mystery',
      imageUrl: item.imageUrl.trim(),
      blackoutDataUrl: item.blackoutDataUrl,
      bgColor: item.bgColor || '#ffffff',
      isReady: true,
    };

    // Check if all connected players are ready
    const connectedIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
    const allReady = connectedIds.every(id => m.playerShadows[id]?.isReady === true);

    if (allReady && connectedIds.length > 0) {
      // All players locked in! Fast-track start in 3 seconds!
      if (m.timer > 3) {
        m.timer = 3;
        m.prepTimer = 3;
      }
    }

    return true;
  }

  private static startShowcase(roomState: RoomState): void {
    const m = roomState.mysteryState;
    if (!m) return;

    const connectedIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);

    // Auto-fill presets for any player who didn't submit
    for (const id of connectedIds) {
      if (!m.playerShadows[id] || !m.playerShadows[id].isReady || !m.playerShadows[id].imageUrl) {
        const preset = MYSTERY_PRESETS[Math.floor(Math.random() * MYSTERY_PRESETS.length)];
        m.playerShadows[id] = {
          playerId: id,
          playerName: roomState.players[id].name,
          answer: preset.name,
          category: preset.category,
          imageUrl: preset.imageUrl,
          bgColor: '#ffffff',
          isReady: true,
        };
      }
    }

    const readyIds = Object.keys(m.playerShadows).filter(id => m.playerShadows[id].isReady);
    m.showcasePlayerIds = shuffle(readyIds.length > 0 ? readyIds : connectedIds);
    m.showcaseIndex = 0;
    m.phase = 'showcase';
    MysteryEngine.loadShowcaseItem(roomState);
  }

  private static loadShowcaseItem(roomState: RoomState): void {
    const m = roomState.mysteryState;
    if (!m) return;

    const guessTime = roomState.settings.shadowGuessTime || 75;

    if (m.showcaseIndex >= m.showcasePlayerIds.length) {
      // All showcased — round over
      MysteryEngine.endRound(roomState);
      return;
    }

    const creatorId = m.showcasePlayerIds[m.showcaseIndex];
    const shadow = m.playerShadows[creatorId];
    if (!shadow) {
      m.showcaseIndex++;
      MysteryEngine.loadShowcaseItem(roomState);
      return;
    }

    m.creatorId = creatorId;
    m.targetAnswer = shadow.answer;
    m.revealedAnswer = maskAnswer(shadow.answer);
    m.category = shadow.category;
    m.imageUrl = shadow.imageUrl;
    m.blackoutDataUrl = shadow.blackoutDataUrl;
    m.bgColor = shadow.bgColor;
    m.filterMode = 'custom_blackout';
    m.revealedTiles = [];
    m.guessedPlayerIds = [];
    m.timer = guessTime;
  }

  static nextShowcase(roomState: RoomState): boolean {
    const m = roomState.mysteryState;
    if (!m || (m.phase !== 'showcase' && m.phase !== 'showcase_reveal')) return false;

    m.showcaseIndex++;
    if (m.showcaseIndex >= m.showcasePlayerIds.length) {
      MysteryEngine.endRound(roomState);
    } else {
      m.phase = 'showcase';
      MysteryEngine.loadShowcaseItem(roomState);
    }
    return true;
  }

  private static endRound(roomState: RoomState): void {
    const m = roomState.mysteryState;
    if (!m) return;

    if (m.currentRound >= m.totalRounds) {
      m.phase = 'game_over';
      roomState.status = 'game_over';
      m.timer = 12;
    } else {
      // Next round — reset prep
      m.currentRound += 1;
      const playerIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
      const prepTime = roomState.settings.shadowPrepTime || 120;

      for (const id of playerIds) {
        if (m.playerShadows[id]) {
          m.playerShadows[id].isReady = false;
          m.playerShadows[id].answer = '';
          m.playerShadows[id].imageUrl = '';
        } else {
          m.playerShadows[id] = {
            playerId: id,
            playerName: roomState.players[id].name,
            answer: '',
            category: '',
            imageUrl: '',
            bgColor: roomState.settings.shadowBgColor || '#ffffff',
            isReady: false,
          };
        }
      }

      m.showcasePlayerIds = [];
      m.showcaseIndex = 0;
      m.creatorId = '';
      m.targetAnswer = '';
      m.revealedAnswer = '';
      m.guessedPlayerIds = [];
      m.phase = 'prep';
      m.prepTimer = prepTime;
      m.timer = prepTime;
    }
  }

  static checkGuess(
    roomState: RoomState,
    playerId: string,
    guess: string
  ): { isMatch: boolean; isClose: boolean; points: number } {
    const m = roomState.mysteryState;
    if (!m || m.phase !== 'showcase' || !m.targetAnswer) {
      return { isMatch: false, isClose: false, points: 0 };
    }

    // Owner cannot guess their own canvas
    if (m.creatorId === playerId) return { isMatch: false, isClose: false, points: 0 };
    if (m.guessedPlayerIds.includes(playerId)) return { isMatch: false, isClose: false, points: 0 };

    const cleanGuess = guess.trim().toLowerCase();
    const cleanAnswer = m.targetAnswer.trim().toLowerCase();

    if (cleanGuess === cleanAnswer) {
      m.guessedPlayerIds.push(playerId);

      const guessTime = roomState.settings.shadowGuessTime || 75;
      const points = Math.max(100, Math.round((m.timer / guessTime) * 500));
      if (roomState.players[playerId]) {
        roomState.players[playerId].score += points;
      }
      // Creator gets 80 pts per guesser
      if (roomState.players[m.creatorId]) {
        roomState.players[m.creatorId].score += 80;
      }

      // Check if all non-owners guessed
      const eligibleGuessers = Object.keys(roomState.players).filter(
        id => id !== m.creatorId && roomState.players[id].isConnected
      );
      if (m.guessedPlayerIds.length >= eligibleGuessers.length && eligibleGuessers.length > 0) {
        m.timer = 0;
      }

      return { isMatch: true, isClose: false, points };
    }

    if (isCloseGuess(cleanGuess, cleanAnswer)) {
      return { isMatch: false, isClose: true, points: 0 };
    }

    return { isMatch: false, isClose: false, points: 0 };
  }

  static tick(roomState: RoomState): { phaseChanged: boolean } {
    const m = roomState.mysteryState;
    if (!m || roomState.status !== 'playing') return { phaseChanged: false };

    m.timer = Math.max(0, m.timer - 1);

    if (m.phase === 'prep') {
      m.prepTimer = Math.max(0, m.prepTimer - 1);
      if (m.timer <= 0) {
        MysteryEngine.startShowcase(roomState);
        return { phaseChanged: true };
      }
      return { phaseChanged: false };
    }

    if (m.phase === 'showcase') {
      if (m.timer <= 0) {
        // Reveal the answer briefly
        m.phase = 'showcase_reveal';
        m.revealedAnswer = (m.targetAnswer || '').toUpperCase();
        m.timer = 6;
        return { phaseChanged: true };
      }
      return { phaseChanged: false };
    }

    if (m.phase === 'showcase_reveal') {
      if (m.timer <= 0) {
        MysteryEngine.nextShowcase(roomState);
        return { phaseChanged: true };
      }
      return { phaseChanged: false };
    }

    return { phaseChanged: false };
  }
}
