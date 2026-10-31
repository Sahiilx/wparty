import { RoomState, GarticGameState, GarticChain, GarticStep, DrawCommand } from '../types';

export class GarticEngine {
  static initGame(roomState: RoomState): void {
    const playerIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
    if (playerIds.length === 0) return;

    for (const id of playerIds) {
      roomState.players[id].score = 0;
    }

    const chains: Record<string, GarticChain> = {};
    for (const id of playerIds) {
      chains[id] = {
        originalAuthorId: id,
        originalAuthorName: roomState.players[id].name,
        steps: [],
      };
    }

    const totalRounds = Math.min(Math.max(playerIds.length, 3), 5);
    const writeTime = roomState.settings.garticWriteTime || 45;

    roomState.garticState = {
      phase: 'writing',
      roundNumber: 1,
      totalRounds,
      timer: writeTime,
      chains,
      submittedPlayerIds: [],
      presentationChainIndex: 0,
      presentationStepIndex: 0,
    };
    roomState.status = 'playing';
  }

  static submitPrompt(roomState: RoomState, playerId: string, promptText: string): boolean {
    const g = roomState.garticState;
    if (!g || g.phase !== 'writing') return false;
    if (g.submittedPlayerIds.includes(playerId)) return false;

    const chain = g.chains[playerId];
    if (chain) {
      chain.steps.push({
        type: 'prompt',
        authorId: playerId,
        authorName: roomState.players[playerId]?.name || 'Player',
        text: promptText.trim().slice(0, 100) || 'A dancing rubber duck',
      });
      g.submittedPlayerIds.push(playerId);
      this.checkAllSubmitted(roomState);
      return true;
    }
    return false;
  }

  static submitDrawing(roomState: RoomState, playerId: string, commands: DrawCommand[]): boolean {
    const g = roomState.garticState;
    if (!g || g.phase !== 'drawing') return false;
    if (g.submittedPlayerIds.includes(playerId)) return false;

    const assignedChain = this.getAssignedChainForPlayer(roomState, playerId);
    if (assignedChain) {
      assignedChain.steps.push({
        type: 'drawing',
        authorId: playerId,
        authorName: roomState.players[playerId]?.name || 'Player',
        drawingCommands: commands,
      });
      g.submittedPlayerIds.push(playerId);
      this.checkAllSubmitted(roomState);
      return true;
    }
    return false;
  }

  static submitGuess(roomState: RoomState, playerId: string, guessText: string): boolean {
    const g = roomState.garticState;
    if (!g || g.phase !== 'guessing') return false;
    if (g.submittedPlayerIds.includes(playerId)) return false;

    const assignedChain = this.getAssignedChainForPlayer(roomState, playerId);
    if (assignedChain) {
      assignedChain.steps.push({
        type: 'prompt',
        authorId: playerId,
        authorName: roomState.players[playerId]?.name || 'Player',
        text: guessText.trim().slice(0, 100) || 'An abstract doodle',
      });
      g.submittedPlayerIds.push(playerId);
      this.checkAllSubmitted(roomState);
      return true;
    }
    return false;
  }

  static getAssignedChainForPlayer(roomState: RoomState, playerId: string): GarticChain | null {
    const g = roomState.garticState;
    if (!g) return null;

    const playerIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
    const pIdx = playerIds.indexOf(playerId);
    if (pIdx === -1) return null;

    const shift = g.roundNumber - 1;
    const targetIdx = (pIdx - shift + playerIds.length * 100) % playerIds.length;
    const targetChainOwnerId = playerIds[targetIdx];
    return g.chains[targetChainOwnerId] || null;
  }

  static checkAllSubmitted(roomState: RoomState): void {
    const g = roomState.garticState;
    if (!g) return;

    const playerIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
    if (g.submittedPlayerIds.length >= playerIds.length && playerIds.length > 0) {
      g.timer = 0;
    }
  }

  static advanceRound(roomState: RoomState): void {
    const g = roomState.garticState;
    if (!g) return;

    const playerIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);

    for (const pId of playerIds) {
      if (!g.submittedPlayerIds.includes(pId)) {
        if (g.phase === 'writing') {
          this.submitPrompt(roomState, pId, 'A dancing rubber duck');
        } else if (g.phase === 'drawing') {
          this.submitDrawing(roomState, pId, []);
        } else if (g.phase === 'guessing') {
          this.submitGuess(roomState, pId, 'Something mysterious');
        }
      }
    }

    g.submittedPlayerIds = [];

    if (g.roundNumber >= g.totalRounds) {
      g.phase = 'presentation';
      g.presentationChainIndex = 0;
      g.presentationStepIndex = 0;
      g.timer = 999;
      return;
    }

    g.roundNumber += 1;
    if (g.roundNumber % 2 === 0) {
      g.phase = 'drawing';
      g.timer = roomState.settings.garticDrawTime || 75;
    } else {
      g.phase = 'guessing';
      g.timer = roomState.settings.garticGuessTime || 30;
    }
  }

  static nextPresentationStep(roomState: RoomState): void {
    const g = roomState.garticState;
    if (!g || g.phase !== 'presentation') return;

    const chainKeys = Object.keys(g.chains);
    if (chainKeys.length === 0) return;

    const currentChain = g.chains[chainKeys[g.presentationChainIndex]];
    if (!currentChain) return;

    if (g.presentationStepIndex < currentChain.steps.length - 1) {
      g.presentationStepIndex += 1;
    } else {
      if (g.presentationChainIndex < chainKeys.length - 1) {
        g.presentationChainIndex += 1;
        g.presentationStepIndex = 0;
      } else {
        g.phase = 'game_over';
      }
    }
  }

  static prevPresentationStep(roomState: RoomState): void {
    const g = roomState.garticState;
    if (!g || g.phase !== 'presentation') return;

    const chainKeys = Object.keys(g.chains);
    if (chainKeys.length === 0) return;

    if (g.presentationStepIndex > 0) {
      g.presentationStepIndex -= 1;
    } else if (g.presentationChainIndex > 0) {
      g.presentationChainIndex -= 1;
      const prevChain = g.chains[chainKeys[g.presentationChainIndex]];
      g.presentationStepIndex = prevChain ? Math.max(0, prevChain.steps.length - 1) : 0;
    }
  }

  static selectPresentationChain(roomState: RoomState, chainIndex: number): void {
    const g = roomState.garticState;
    if (!g || g.phase !== 'presentation') return;
    const chainKeys = Object.keys(g.chains);
    if (chainIndex >= 0 && chainIndex < chainKeys.length) {
      g.presentationChainIndex = chainIndex;
      g.presentationStepIndex = 0;
    }
  }

  static selectPresentationStep(roomState: RoomState, stepIndex: number): void {
    const g = roomState.garticState;
    if (!g || g.phase !== 'presentation') return;
    const chainKeys = Object.keys(g.chains);
    const currentChain = g.chains[chainKeys[g.presentationChainIndex]];
    if (currentChain && stepIndex >= 0 && stepIndex < currentChain.steps.length) {
      g.presentationStepIndex = stepIndex;
    }
  }

  static tick(roomState: RoomState): { phaseChanged: boolean } {
    const g = roomState.garticState;
    if (!g || roomState.status !== 'playing' || g.phase === 'presentation' || g.phase === 'game_over') {
      return { phaseChanged: false };
    }

    g.timer = Math.max(0, g.timer - 1);
    if (g.timer <= 0) {
      this.advanceRound(roomState);
      return { phaseChanged: true };
    }

    return { phaseChanged: false };
  }
}
