import type * as Party from "partykit/server";
import { 
  RoomState, 
  ClientMessage, 
  ServerMessage, 
  ChatMessage, 
  Player 
} from "./types";
import { SkribblEngine } from "./games/skribbl";
import { FortuneEngine } from "./games/fortune";
import { MysteryEngine } from "./games/mystery";
import { GarticEngine } from "./games/gartic";
import { ImposterEngine } from "./games/imposter";
import { QuizEngine } from "./games/quiz";
import { MastermindEngine } from "./games/mastermind";

export default class PartyServer implements Party.Server {
  roomState: RoomState;
  intervalTimer?: ReturnType<typeof setInterval>;

  constructor(readonly room: Party.Room) {
    this.roomState = {
      code: room.id.toUpperCase(),
      hostId: '',
      status: 'lobby',
      selectedGameId: 'skribbl',
      players: {},
      chat: [],
      settings: {
        roundTime: 75,
        totalRounds: 3,
        maxPlayers: 12,
        doodleWordCount: 3,
        doodleHintCount: 1,
        doodleCustomWords: '',
        doodleCustomOnly: false,
        garticWriteTime: 45,
        garticDrawTime: 75,
        garticGuessTime: 30,
        duelTime: 60,
        shadowPrepTime: 120,
        shadowGuessTime: 75,
        shadowBgColor: '#ffffff',
        doodleAllowCustomInput: true,
        quizCategory: 'All',
        quizDifficulty: 'progressive',
      },
    };
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    this.syncToConnection(conn);
  }

  onClose(conn: Party.Connection) {
    const player = this.roomState.players[conn.id];
    if (player) {
      player.isConnected = false;
      this.addSystemMessage(`${player.name} left the room.`);

      if (player.isHost) {
        if (this.roomState.status === 'playing') {
          // If host disconnects during a match, end game and return to lobby
          this.stopTicker();
          this.roomState.status = 'lobby';
          this.roomState.skribblState = undefined;
          this.roomState.fortuneState = undefined;
          this.roomState.mysteryState = undefined;
          this.roomState.garticState = undefined;
          this.roomState.imposterState = undefined;
          this.roomState.quizState = undefined;
          this.roomState.mastermindState = undefined;
          this.addSystemMessage(`Party host disconnected — match ended and returned to lobby.`);
        }

        const remainingIds = Object.keys(this.roomState.players).filter(
          id => id !== conn.id && this.roomState.players[id].isConnected
        );
        if (remainingIds.length > 0) {
          const newHostId = remainingIds[0];
          this.roomState.players[newHostId].isHost = true;
          this.roomState.hostId = newHostId;
          this.addSystemMessage(`${this.roomState.players[newHostId].name} is now the party leader.`);
        } else {
          // No connected players left — reset hostId so the next person who joins or reconnects becomes leader
          this.roomState.hostId = '';
          this.stopTicker();
          this.roomState.status = 'lobby';
        }
      }

      // Handle mid-game disconnections
      if (this.roomState.status === 'playing') {
        const s = this.roomState.skribblState;
        if (s && s.phase === 'drawing') {
          const isDrawer = s.mode === 'duel'
            ? (s.drawer1Id === conn.id || s.drawer2Id === conn.id)
            : (s.currentDrawerId === conn.id);
          if (isDrawer) {
            s.timer = 0; // Force skip the round
            this.addSystemMessage(`⚠️ Drawer disconnected — skipping round.`);
          }
        }

        const f = this.roomState.fortuneState;
        if (f && f.phase === 'guessing' && f.currentTurnPlayerId === conn.id) {
          // Mark as used and skip their turn
          if (!f.usedTurnPlayerIds.includes(conn.id)) {
            f.usedTurnPlayerIds.push(conn.id);
          }
          const playerIds = Object.keys(this.roomState.players).filter(
            id => id !== conn.id && this.roomState.players[id].isConnected
          );
          // Advance to next player
          const remaining = f.guesserOrder.filter(id => !f.usedTurnPlayerIds.includes(id) && playerIds.includes(id));
          if (remaining.length > 0) {
            f.currentTurnPlayerId = remaining[0];
          } else {
            const connectedGuessers = f.guesserOrder.filter(id => playerIds.includes(id));
            if (connectedGuessers.length > 0) {
              f.usedTurnPlayerIds = [];
              f.currentTurnPlayerId = connectedGuessers[0];
            } else {
              f.phase = 'round_recap';
              f.timer = 8;
            }
          }
        }

        const g = this.roomState.garticState;
        if (g && (g.phase === 'writing' || g.phase === 'drawing' || g.phase === 'guessing')) {
          if (!g.submittedPlayerIds.includes(conn.id)) {
            g.submittedPlayerIds.push(conn.id); // Auto-submit blank
            const allIds = Object.keys(this.roomState.players).filter(
              id => id !== conn.id && this.roomState.players[id].isConnected
            );
            const allSubmitted = allIds.every(id => g.submittedPlayerIds.includes(id));
            if (allSubmitted) {
              g.timer = 0; // Force phase advance
            }
          }
        }

        const gi = this.roomState.imposterState;
        if (gi && gi.phase === 'clue_giving' && gi.currentSpeakerId === conn.id) {
          gi.timer = 0; // Force advance
        }
      }

      this.broadcastState();
    }
  }

  onMessage(messageStr: string, sender: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(messageStr);
    } catch {
      return;
    }

    const playerId = sender.id;

    switch (msg.type) {
      case 'JOIN_ROOM': {
        const activeHost = this.roomState.hostId && this.roomState.players[this.roomState.hostId]?.isConnected;
        const isHost = !activeHost;
        if (isHost) {
          this.roomState.hostId = playerId;
        }

        const existingPlayer = this.roomState.players[playerId];
        const newPlayer: Player = {
          id: playerId,
          name: msg.name.trim().slice(0, 16) || `Player_${playerId.slice(0, 4)}`,
          avatar: msg.avatar || '🎨',
          isHost: isHost || (existingPlayer?.isHost ?? false),
          isReady: existingPlayer?.isReady ?? false,
          score: existingPlayer?.score ?? 0,
          isConnected: true,
        };
        if (newPlayer.isHost) {
          this.roomState.hostId = playerId;
        }

        this.roomState.players[playerId] = newPlayer;
        this.addSystemMessage(`${newPlayer.name} joined the party!`);
        this.broadcastState();
        break;
      }

      case 'UPDATE_PROFILE': {
        const p = this.roomState.players[playerId];
        if (p) {
          const oldName = p.name;
          if (msg.name) p.name = msg.name.trim().slice(0, 16);
          if (msg.avatar) p.avatar = msg.avatar;
          if (oldName !== p.name) {
            this.addSystemMessage(`${oldName} changed their name to ${p.name}.`);
          }
          this.broadcastState();
        }
        break;
      }

      case 'TOGGLE_READY': {
        const p = this.roomState.players[playerId];
        if (p) {
          p.isReady = !p.isReady;
          this.broadcastState();
        }
        break;
      }

      case 'SELECT_GAME': {
        const p = this.roomState.players[playerId];
        if (p && p.isHost && this.roomState.status === 'lobby') {
          this.roomState.selectedGameId = msg.gameId;
          const gameNames: Record<string, string> = {
            skribbl: "Doodle Dash (Classic)",
            skribbl_duel: "⚔️ Duo Duel (Speed Battle)",
            word_fortune: "🎡 Word Wheel",
            mystery_reveal: "🔍 Silhouette Showdown",
            gartic: "📞 Telephone Tale",
            word_imposter: "🕵️ Word Imposter",
            quiz_kbc: "💰 Crorepati Quiz (15 Qs)",
            mastermind: "🔫 Mastermind Protocol",
          };
          this.addSystemMessage(`Party leader selected ${gameNames[msg.gameId] || msg.gameId}`);
          this.broadcastState();
        }
        break;
      }

      case 'UPDATE_SETTINGS': {
        const p = this.roomState.players[playerId];
        if (p && p.isHost) {
          this.roomState.settings = { ...this.roomState.settings, ...msg.settings };
          this.broadcastState();
        }
        break;
      }

      case 'START_GAME': {
        const p = this.roomState.players[playerId];
        if (p && p.isHost && this.roomState.status === 'lobby') {
          if (this.roomState.selectedGameId === 'skribbl') {
            SkribblEngine.initGame(this.roomState, 'classic');
            this.startTicker();
            this.addSystemMessage(`🎮 Doodle Dash started! Guess what's being drawn!`);
            this.broadcastState();
          } else if (this.roomState.selectedGameId === 'skribbl_duel') {
            SkribblEngine.initGame(this.roomState, 'duel');
            this.startTicker();
            this.addSystemMessage(`⚔️ Duo Duel started! Drawers, race your canvases!`);
            this.broadcastState();
          } else if (this.roomState.selectedGameId === 'word_fortune') {
            FortuneEngine.initGame(this.roomState);
            this.startTicker();
            this.addSystemMessage(`🎡 Word Wheel started! Guess letters or solve the puzzle!`);
            this.broadcastState();
          } else if (this.roomState.selectedGameId === 'mystery_reveal') {
            MysteryEngine.initGame(this.roomState);
            this.startTicker();
            this.addSystemMessage(`🔍 Silhouette Showdown started! Guess the secret shadow!`);
            this.broadcastState();
          } else if (this.roomState.selectedGameId === 'gartic') {
            GarticEngine.initGame(this.roomState);
            this.startTicker();
            this.addSystemMessage(`📞 Telephone Tale started! Everyone write a funny prompt!`);
            this.broadcastState();
          } else if (this.roomState.selectedGameId === 'word_imposter') {
            ImposterEngine.initGame(this.roomState);
            this.startTicker();
            this.addSystemMessage(`🕵️ Word Imposter started! Give clues, find the spy!`);
            this.broadcastState();
          } else if (this.roomState.selectedGameId === 'quiz_kbc') {
            QuizEngine.initGame(this.roomState);
            this.startTicker();
            this.addSystemMessage(`💰 Crorepati Quiz started! 15 Questions, 4 Lifelines. Lock your answers!`);
            this.broadcastState();
          } else if (this.roomState.selectedGameId === 'mastermind') {
            const playerCount = Object.values(this.roomState.players).filter(p => p.isConnected).length;
            if (playerCount < 5) {
              this.addSystemMessage(`🤖 Solo/Small party test detected: Adding AI Simulated Operatives to complete 5-player protocol!`);
            }
            MastermindEngine.initGame(this.roomState);
            this.startTicker();
            this.addSystemMessage(`🔫 Mastermind Protocol started! Cards are being dealt...`);
            this.broadcastState();
          }
        }
        break;
      }

      case 'RETURN_TO_LOBBY': {
        const p = this.roomState.players[playerId];
        if (p && p.isHost) {
          this.stopTicker();
          this.roomState.status = 'lobby';
          this.roomState.skribblState = undefined;
          this.roomState.fortuneState = undefined;
          this.roomState.mysteryState = undefined;
          this.roomState.garticState = undefined;
          this.roomState.imposterState = undefined;
          this.roomState.quizState = undefined;
          this.roomState.mastermindState = undefined;
          this.addSystemMessage(`Game ended by leader. Returned to party lobby.`);
          this.broadcastState();
        }
        break;
      }

      case 'HOST_SKIP_TIMER': {
        const hp = this.roomState.players[playerId];
        if (hp && hp.isHost && this.roomState.status === 'playing') {
          if (this.roomState.skribblState) this.roomState.skribblState.timer = 0;
          else if (this.roomState.fortuneState) this.roomState.fortuneState.timer = 0;
          else if (this.roomState.mysteryState) this.roomState.mysteryState.timer = 0;
          else if (this.roomState.garticState) this.roomState.garticState.timer = 0;
          else if (this.roomState.imposterState) this.roomState.imposterState.timer = 0;
          else if (this.roomState.quizState) this.roomState.quizState.timer = 0;
          else if (this.roomState.mastermindState) this.roomState.mastermindState.timer = 0;
          this.broadcastState();
        }
        break;
      }

      case 'SEND_CHAT': {
        const text = msg.text.trim();
        if (!text) return;
        const player = this.roomState.players[playerId];
        if (!player) return;

        // 1. Skribbl & Duo Duel Guess Check
        if (this.roomState.status === 'playing' && this.roomState.skribblState?.phase === 'drawing') {
          const guessResult = SkribblEngine.checkGuess(this.roomState, playerId, text, msg.targetBoard);
          if (guessResult.isMatch) {
            const drawer = guessResult.awardedDrawerId ? this.roomState.players[guessResult.awardedDrawerId]?.name : null;
            const targetNote = drawer ? ` on ${drawer}'s canvas` : '';
            const chatMsg: ChatMessage = {
              id: Math.random().toString(36).slice(2),
              senderId: playerId,
              senderName: player.name,
              text: `guessed the word${targetNote}! (+${guessResult.points} pts)`,
              timestamp: Date.now(),
              type: 'guess_correct',
              targetBoard: msg.targetBoard,
            };
            this.roomState.chat.push(chatMsg);
            this.room.broadcast(JSON.stringify({ type: 'CHAT_MESSAGE', message: chatMsg }));
            this.broadcastState();
            return;
          }
          if (guessResult.isClose) {
            // Send close hint privately to the guesser only
            const closeMsg: ChatMessage = {
              id: Math.random().toString(36).slice(2),
              senderName: 'System',
              text: `"${text}" is very close! 🔥`,
              timestamp: Date.now(),
              type: 'guess_close',
            };
            sender.send(JSON.stringify({ type: 'CHAT_MESSAGE', message: closeMsg }));
            // Also broadcast their guess text masked so others see they tried (but not what they typed)
            const maskedMsg: ChatMessage = {
              id: Math.random().toString(36).slice(2),
              senderId: playerId,
              senderName: player.name,
              text: `is very close! 🔥`,
              timestamp: Date.now(),
              type: 'guess_close',
            };
            this.room.broadcast(JSON.stringify({ type: 'CHAT_MESSAGE', message: maskedMsg }));
            return;
          }
          // Wrong guess — show in chat normally so it doesn't feel like it vanished
          const wrongMsg: ChatMessage = {
            id: Math.random().toString(36).slice(2),
            senderId: playerId,
            senderName: player.name,
            text: text.slice(0, 80),
            timestamp: Date.now(),
            type: 'chat',
          };
          this.roomState.chat.push(wrongMsg);
          if (this.roomState.chat.length > 50) this.roomState.chat.shift();
          this.room.broadcast(JSON.stringify({ type: 'CHAT_MESSAGE', message: wrongMsg }));
          return;
        }

        // 2. Word Fortune Solve Check
        if (this.roomState.status === 'playing' && this.roomState.fortuneState?.phase === 'guessing') {
          const solveResult = FortuneEngine.checkSolve(this.roomState, playerId, text);
          if (solveResult.isMatch) {
            const chatMsg: ChatMessage = {
              id: Math.random().toString(36).slice(2),
              senderId: playerId,
              senderName: player.name,
              text: `SOLVED THE ENTIRE PUZZLE! "${this.roomState.fortuneState?.secretPhrase}" (+${solveResult.points} pts)`,
              timestamp: Date.now(),
              type: 'guess_correct',
            };
            this.roomState.chat.push(chatMsg);
            this.room.broadcast(JSON.stringify({ type: 'CHAT_MESSAGE', message: chatMsg }));
            this.broadcastState();
            return;
          } else if (solveResult.isAttempt) {
            // Deduct points for wrong solve guess
            const penaltyMsg: ChatMessage = {
              id: Math.random().toString(36).slice(2),
              senderId: playerId,
              senderName: player.name,
              text: `guessed "${text}" — INCORRECT PUZZLE SOLVE! (-${solveResult.penalty} pts penalty)`,
              timestamp: Date.now(),
              type: 'guess_close',
            };
            this.roomState.chat.push(penaltyMsg);
            this.room.broadcast(JSON.stringify({ type: 'CHAT_MESSAGE', message: penaltyMsg }));
            this.broadcastState();
            return;
          }
        }

        // 3. Mystery Reveal Check
        if (this.roomState.status === 'playing' && this.roomState.mysteryState?.phase === 'showcase') {
          const guessResult = MysteryEngine.checkGuess(this.roomState, playerId, text);
          if (guessResult.isMatch) {
            const chatMsg: ChatMessage = {
              id: Math.random().toString(36).slice(2),
              senderId: playerId,
              senderName: player.name,
              text: `IDENTIFIED THE MYSTERY PICTURE! (+${guessResult.points} pts)`,
              timestamp: Date.now(),
              type: 'guess_correct',
            };
            this.roomState.chat.push(chatMsg);
            this.room.broadcast(JSON.stringify({ type: 'CHAT_MESSAGE', message: chatMsg }));
            this.broadcastState();
            return;
          }
          if (guessResult.isClose) {
            // Private close hint to guesser
            const closeMsg: ChatMessage = {
              id: Math.random().toString(36).slice(2),
              senderName: 'System',
              text: `"${text}" is super close! 🔥`,
              timestamp: Date.now(),
              type: 'guess_close',
            };
            sender.send(JSON.stringify({ type: 'CHAT_MESSAGE', message: closeMsg }));
            // Show others that this player is close, without revealing text
            const maskedMsg: ChatMessage = {
              id: Math.random().toString(36).slice(2),
              senderId: playerId,
              senderName: player.name,
              text: `is super close! 🔥`,
              timestamp: Date.now(),
              type: 'guess_close',
            };
            this.room.broadcast(JSON.stringify({ type: 'CHAT_MESSAGE', message: maskedMsg }));
            return;
          }
          // Wrong guess — still show in chat
          const wrongMsg: ChatMessage = {
            id: Math.random().toString(36).slice(2),
            senderId: playerId,
            senderName: player.name,
            text: text.slice(0, 80),
            timestamp: Date.now(),
            type: 'chat',
          };
          this.roomState.chat.push(wrongMsg);
          if (this.roomState.chat.length > 50) this.roomState.chat.shift();
          this.room.broadcast(JSON.stringify({ type: 'CHAT_MESSAGE', message: wrongMsg }));
          return;
        }

        // Standard chat
        const chatMsg: ChatMessage = {
          id: Math.random().toString(36).slice(2),
          senderId: playerId,
          senderName: player.name,
          text: text.slice(0, 140),
          timestamp: Date.now(),
          type: 'chat',
        };
        this.roomState.chat.push(chatMsg);
        if (this.roomState.chat.length > 50) this.roomState.chat.shift();
        this.room.broadcast(JSON.stringify({ type: 'CHAT_MESSAGE', message: chatMsg }));
        break;
      }

      case 'SKRIBBL_CHOOSE_WORD': {
        if (this.roomState.status === 'playing') {
          const ok = SkribblEngine.selectWord(this.roomState, playerId, msg.word);
          if (ok) {
            this.addSystemMessage(`A word was chosen! Start drawing!`);
            this.broadcastState();
          }
        }
        break;
      }

      case 'SKRIBBL_DRAW_COMMAND': {
        if (this.roomState.status === 'playing') {
          const ok = SkribblEngine.addDrawCommand(this.roomState, playerId, msg.command);
          if (ok) {
            for (const conn of this.room.getConnections()) {
              if (conn.id !== playerId) {
                conn.send(JSON.stringify({ type: 'SKRIBBL_DRAW_COMMAND', command: msg.command }));
              }
            }
          }
        }
        break;
      }

      case 'FORTUNE_SET_PHRASE': {
        if (this.roomState.status === 'playing') {
          const ok = FortuneEngine.setPhrase(this.roomState, playerId, msg.phrase, msg.category, msg.language);
          if (ok) {
            this.addSystemMessage(`Puzzle set! Category: ${msg.category}`);
            this.broadcastState();
          }
        }
        break;
      }

      case 'FORTUNE_GUESS_LETTER': {
        if (this.roomState.status === 'playing') {
          const res = FortuneEngine.guessLetter(this.roomState, playerId, msg.letter);
          const p = this.roomState.players[playerId];
          if (res.isHit) {
            this.addSystemMessage(`🎉 ${p?.name || 'Player'} found '${msg.letter.toUpperCase()}'! (+${res.points} pts) ${res.stage ?? ''}`);
          } else if (res.count === 0 && res.points === 0) {
            this.addSystemMessage(`❌ No '${msg.letter.toUpperCase()}' in the puzzle.`);
          }
          this.broadcastState();
        }
        break;
      }

      case 'MYSTERY_SUBMIT_PREP': {
        if (this.roomState.status === 'playing') {
          const ok = MysteryEngine.submitPrep(this.roomState, playerId, {
            answer: msg.answer,
            category: msg.category,
            imageUrl: msg.imageUrl,
            blackoutDataUrl: msg.blackoutDataUrl,
            bgColor: msg.bgColor,
          });
          if (ok) {
            const p = this.roomState.players[playerId];
            this.addSystemMessage(`✅ ${p?.name || 'Player'} is ready with their shadow!`);
            this.broadcastState();
          }
        }
        break;
      }

      case 'MYSTERY_NEXT_SHOWCASE': {
        const mnp = this.roomState.players[playerId];
        if (mnp && mnp.isHost && this.roomState.status === 'playing') {
          MysteryEngine.nextShowcase(this.roomState);
          this.broadcastState();
        }
        break;
      }

      case 'MYSTERY_SET_IMAGE': {
        if (this.roomState.status === 'playing') {
          const ok = MysteryEngine.submitPrep(this.roomState, playerId, {
            answer: msg.answer,
            category: msg.category,
            imageUrl: msg.imageUrl,
            blackoutDataUrl: msg.blackoutDataUrl,
            bgColor: msg.bgColor || '#ffffff',
          });
          if (ok) {
            const p = this.roomState.players[playerId];
            this.addSystemMessage(`✅ ${p?.name || 'Player'} locked in their shadow image!`);
            this.broadcastState();
          }
        }
        break;
      }

      case 'MYSTERY_REVEAL_TILE': {
        // Legacy support - no-op in new flow
        break;
      }

      case 'GARTIC_SUBMIT_PROMPT': {
        if (this.roomState.status === 'playing') {
          const ok = GarticEngine.submitPrompt(this.roomState, playerId, msg.text);
          if (ok) {
            const p = this.roomState.players[playerId];
            this.addSystemMessage(`✍️ ${p?.name || 'Player'} submitted their prompt!`);
            this.broadcastState();
          }
        }
        break;
      }

      case 'GARTIC_SUBMIT_DRAWING': {
        if (this.roomState.status === 'playing') {
          const ok = GarticEngine.submitDrawing(this.roomState, playerId, msg.commands);
          if (ok) {
            const p = this.roomState.players[playerId];
            this.addSystemMessage(`🎨 ${p?.name || 'Player'} submitted their sketch!`);
            this.broadcastState();
          }
        }
        break;
      }

      case 'GARTIC_SUBMIT_GUESS': {
        if (this.roomState.status === 'playing') {
          const ok = GarticEngine.submitGuess(this.roomState, playerId, msg.text);
          if (ok) {
            const p = this.roomState.players[playerId];
            this.addSystemMessage(`🤔 ${p?.name || 'Player'} submitted their guess!`);
            this.broadcastState();
          }
        }
        break;
      }

      case 'GARTIC_NEXT_PRESENTATION_STEP': {
        const p = this.roomState.players[playerId];
        if (p && p.isHost && this.roomState.status === 'playing') {
          GarticEngine.nextPresentationStep(this.roomState);
          this.broadcastState();
        }
        break;
      }

      case 'GARTIC_PREV_PRESENTATION_STEP': {
        const p = this.roomState.players[playerId];
        if (p && p.isHost && this.roomState.status === 'playing') {
          GarticEngine.prevPresentationStep(this.roomState);
          this.broadcastState();
        }
        break;
      }

      case 'GARTIC_SELECT_PRESENTATION_CHAIN': {
        const p = this.roomState.players[playerId];
        if (p && p.isHost && this.roomState.status === 'playing') {
          GarticEngine.selectPresentationChain(this.roomState, msg.chainIndex);
          this.broadcastState();
        }
        break;
      }

      case 'GARTIC_SELECT_PRESENTATION_STEP': {
        const p = this.roomState.players[playerId];
        if (p && p.isHost && this.roomState.status === 'playing') {
          GarticEngine.selectPresentationStep(this.roomState, msg.stepIndex);
          this.broadcastState();
        }
        break;
      }

      case 'IMPOSTER_SUBMIT_CLUE': {
        if (this.roomState.status === 'playing') {
          const ok = ImposterEngine.submitClue(this.roomState, playerId, msg.clue);
          if (ok) {
            const p = this.roomState.players[playerId];
            this.addSystemMessage(`🗣️ ${p?.name || 'Player'} gave their clue!`);
            this.broadcastState();
          }
        }
        break;
      }

      case 'IMPOSTER_VOTE': {
        if (this.roomState.status === 'playing') {
          const ok = ImposterEngine.vote(this.roomState, playerId, msg.suspectId);
          if (ok) {
            const p = this.roomState.players[playerId];
            this.addSystemMessage(`🗳️ ${p?.name || 'Player'} cast their vote!`);
            this.broadcastState();
          }
        }
        break;
      }

      case 'IMPOSTER_GUESS_WORD': {
        if (this.roomState.status === 'playing') {
          const ok = ImposterEngine.imposterGuess(this.roomState, playerId, msg.guess);
          if (ok) {
            this.broadcastState();
          }
        }
        break;
      }

      case 'QUIZ_LOCK_ANSWER': {
        if (this.roomState.status === 'playing') {
          const ok = QuizEngine.lockAnswer(this.roomState, playerId, msg.answer, msg.isDouble);
          if (ok) {
            const p = this.roomState.players[playerId];
            this.addSystemMessage(`🔒 ${p?.name || 'Player'} locked in their answer!`);
            this.broadcastState();
          }
        }
        break;
      }

      case 'QUIZ_USE_LIFELINE': {
        if (this.roomState.status === 'playing') {
          const ok = QuizEngine.useLifeline(this.roomState, playerId, msg.lifeline);
          if (ok) {
            const p = this.roomState.players[playerId];
            const lifelineNames: Record<string, string> = {
              fifty_fifty: '50:50',
              audience_poll: 'Audience Poll',
              skip: 'Skip / Free Pass',
              double_dip: 'Double Dip',
            };
            this.addSystemMessage(`💡 ${p?.name || 'Player'} used their ${lifelineNames[msg.lifeline] || msg.lifeline} lifeline!`);
            this.broadcastState();
          }
        }
        break;
      }

      case 'MASTERMIND_SUBMIT_MINIGAME_SCORE': {
        if (this.roomState.status === 'playing') {
          MastermindEngine.submitMinigameScore(this.roomState, playerId, msg.score);
          this.broadcastState();
        }
        break;
      }

      case 'MASTERMIND_BUY_ITEM': {
        if (this.roomState.status === 'playing') {
          MastermindEngine.buyDirectItem(this.roomState, playerId, msg.item);
          this.broadcastState();
        }
        break;
      }

      case 'MASTERMIND_BID_AUCTION': {
        if (this.roomState.status === 'playing') {
          MastermindEngine.bidAuction(this.roomState, playerId, msg.slotId, msg.bidAmount);
          this.broadcastState();
        }
        break;
      }

      case 'MASTERMIND_CLAIM_FREE_CARDS': {
        if (this.roomState.status === 'playing') {
          MastermindEngine.claimFreeCards(this.roomState, playerId);
          this.broadcastState();
        }
        break;
      }

      case 'MASTERMIND_CRAFT_ITEM': {
        if (this.roomState.status === 'playing') {
          MastermindEngine.craftItem(this.roomState, playerId, msg.resultItem);
          this.broadcastState();
        }
        break;
      }

      case 'MASTERMIND_TABLE_ACTION': {
        // No persistent state; just broadcast for other clients to animate
        this.broadcastState();
        break;
      }

      case 'MASTERMIND_USE_ABILITY': {
        if (this.roomState.status === 'playing') {
          MastermindEngine.useAbility(this.roomState, playerId, msg.abilityType, msg.targetId);
          this.broadcastState();
        }
        break;
      }

      case 'MASTERMIND_VOTE_SUSPECT': {
        if (this.roomState.status === 'playing') {
          if (this.roomState.mastermindState?.votes) {
            this.roomState.mastermindState.votes[playerId] = msg.suspectId;
          }
          this.broadcastState();
        }
        break;
      }

      case 'MASTERMIND_NEXT_PHASE': {
        // Host can force-advance the phase
        const hp = this.roomState.players[playerId];
        if (hp?.isHost && this.roomState.mastermindState) {
          this.roomState.mastermindState.timer = 0;
          this.broadcastState();
        }
        break;
      }

      case 'MASTERMIND_PLAYER_MOVE': {
        if (this.roomState.status === 'playing') {
          MastermindEngine.playerMove(
            this.roomState,
            playerId,
            msg.x,
            msg.z,
            msg.rotation,
            msg.isMoving,
            msg.skin,
            msg.sectorId
          );
          this.broadcastState();
        }
        break;
      }

      case 'MASTERMIND_COLLECT_SCRAP': {
        if (this.roomState.status === 'playing') {
          MastermindEngine.collectScrap(this.roomState, playerId, msg.scrapId);
          this.broadcastState();
        }
        break;
      }

      case 'MASTERMIND_SELECT_SKIN': {
        if (this.roomState.status === 'playing') {
          MastermindEngine.selectSkin(this.roomState, playerId, msg.skin);
          this.broadcastState();
        }
        break;
      }
    }
  }

  startTicker() {
    this.stopTicker();
    this.intervalTimer = setInterval(() => {
      if (this.roomState.status === 'playing') {
        if (this.roomState.selectedGameId === 'skribbl' || this.roomState.selectedGameId === 'skribbl_duel') {
          SkribblEngine.tick(this.roomState);
        } else if (this.roomState.selectedGameId === 'word_fortune') {
          FortuneEngine.tick(this.roomState);
        } else if (this.roomState.selectedGameId === 'mystery_reveal') {
          MysteryEngine.tick(this.roomState);
        } else if (this.roomState.selectedGameId === 'gartic') {
          GarticEngine.tick(this.roomState);
        } else if (this.roomState.selectedGameId === 'word_imposter') {
          ImposterEngine.tick(this.roomState);
        } else if (this.roomState.selectedGameId === 'quiz_kbc') {
          QuizEngine.tick(this.roomState);
        } else if (this.roomState.selectedGameId === 'mastermind') {
          MastermindEngine.tick(this.roomState);
        }
        this.broadcastState();
      }
    }, 1000);
  }

  stopTicker() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = undefined;
    }
  }

  addSystemMessage(text: string) {
    const msg: ChatMessage = {
      id: Math.random().toString(36).slice(2),
      senderName: 'System',
      text,
      timestamp: Date.now(),
      type: 'system',
    };
    this.roomState.chat.push(msg);
    if (this.roomState.chat.length > 50) this.roomState.chat.shift();
    this.room.broadcast(JSON.stringify({ type: 'CHAT_MESSAGE', message: msg }));
  }

  broadcastState() {
    for (const conn of this.room.getConnections()) {
      this.syncToConnection(conn);
    }
  }

  syncToConnection(conn: Party.Connection) {
    const stateCopy: RoomState = JSON.parse(JSON.stringify(this.roomState));

    if (stateCopy.skribblState) {
      const isDrawer = stateCopy.skribblState.mode === 'duel'
        ? (stateCopy.skribblState.drawer1Id === conn.id || stateCopy.skribblState.drawer2Id === conn.id)
        : (stateCopy.skribblState.currentDrawerId === conn.id);

      const isRecap = stateCopy.skribblState.phase === 'round_recap' || stateCopy.skribblState.phase === 'game_over';
      if (!isDrawer && !isRecap) {
        delete stateCopy.skribblState.secretWord;
        stateCopy.skribblState.wordChoices = [];
      }
    }

    if (stateCopy.fortuneState) {
      const isCreator = stateCopy.fortuneState.puzzleCreatorId === conn.id;
      const isRecap = stateCopy.fortuneState.phase === 'round_recap' || stateCopy.fortuneState.phase === 'game_over';
      if (!isCreator && !isRecap) {
        delete stateCopy.fortuneState.secretPhrase;
      }
    }

    if (stateCopy.mysteryState) {
      const isCreator = stateCopy.mysteryState.creatorId === conn.id;
      const isRecap = stateCopy.mysteryState.phase === 'showcase_reveal' || stateCopy.mysteryState.phase === 'game_over';
      if (!isCreator && !isRecap) {
        delete stateCopy.mysteryState.targetAnswer;
      }
    }

    if (stateCopy.imposterState) {
      const isImposter = stateCopy.imposterState.imposterId === conn.id;
      const isReveal = stateCopy.imposterState.phase === 'reveal' || stateCopy.imposterState.phase === 'imposter_guess' || stateCopy.imposterState.phase === 'round_recap' || stateCopy.imposterState.phase === 'game_over';
      if (!isReveal) {
        if (isImposter) {
          // Imposter sees only imposterWord, secretWord hidden
          delete stateCopy.imposterState.secretWord;
        } else {
          // Crew sees only secretWord, imposterWord hidden
          delete stateCopy.imposterState.imposterWord;
        }
      }
    }

    if (stateCopy.quizState) {
      const isReveal = stateCopy.quizState.phase === 'reveal' || stateCopy.quizState.phase === 'game_over';
      if (!isReveal) {
        // Hide correct answer
        delete (stateCopy.quizState.question as any).correct;
        // Only allow player to see their own locked answer
        const myLock = stateCopy.quizState.lockedAnswers?.[conn.id];
        stateCopy.quizState.lockedAnswers = myLock ? { [conn.id]: myLock } : {};
        const mySecondLock = stateCopy.quizState.doubleSecondAnswers?.[conn.id];
        stateCopy.quizState.doubleSecondAnswers = mySecondLock ? { [conn.id]: mySecondLock } : {};
      }
      // Lifelines are strictly individual: only send conn.id's audience poll and eliminated options
      stateCopy.quizState.audiencePoll = stateCopy.quizState.audiencePolls?.[conn.id];
      delete stateCopy.quizState.audiencePolls;
      const myElim = stateCopy.quizState.eliminatedOptions?.[conn.id];
      stateCopy.quizState.eliminatedOptions = myElim ? { [conn.id]: myElim } : {};
    }

    const syncMsg: ServerMessage = {
      type: 'SYNC_STATE',
      state: stateCopy,
    };
    conn.send(JSON.stringify(syncMsg));
  }
}
