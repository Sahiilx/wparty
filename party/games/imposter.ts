import { RoomState, ImposterGameState } from '../types';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const WORD_PAIRS: Array<{ secret: string; imposter: string }> = [
  { secret: 'PIZZA', imposter: 'BURGER' },
  { secret: 'LION', imposter: 'TIGER' },
  { secret: 'GUITAR', imposter: 'VIOLIN' },
  { secret: 'COFFEE', imposter: 'TEA' },
  { secret: 'FOOTBALL', imposter: 'BASKETBALL' },
  { secret: 'BEACH', imposter: 'SWIMMING POOL' },
  { secret: 'CAT', imposter: 'DOG' },
  { secret: 'APPLE', imposter: 'PEAR' },
  { secret: 'DOCTOR', imposter: 'NURSE' },
  { secret: 'POLICE', imposter: 'DETECTIVE' },
  { secret: 'BIRTHDAY CAKE', imposter: 'WEDDING CAKE' },
  { secret: 'MINECRAFT', imposter: 'ROBLOX' },
  { secret: 'SUPERMAN', imposter: 'BATMAN' },
  { secret: 'TOKYO', imposter: 'OSAKA' },
  { secret: 'INSTAGRAM', imposter: 'TIKTOK' },
  { secret: 'IPHONE', imposter: 'ANDROID PHONE' },
  { secret: 'FERRARI', imposter: 'LAMBORGHINI' },
  { secret: 'SUSHI', imposter: 'SASHIMI' },
  { secret: 'CRICKET', imposter: 'BASEBALL' },
  { secret: 'YOUTUBE', imposter: 'NETFLIX' },
  { secret: 'CHOCOLATE', imposter: 'VANILLA' },
  { secret: 'SWIMMING', imposter: 'DIVING' },
  { secret: 'SUNRISE', imposter: 'SUNSET' },
  { secret: 'AIRPORT', imposter: 'TRAIN STATION' },
  { secret: 'HOSPITAL', imposter: 'CLINIC' },
  { secret: 'PIANO', imposter: 'KEYBOARD' },
  { secret: 'SHARK', imposter: 'DOLPHIN' },
  { secret: 'WINTER', imposter: 'AUTUMN' },
  { secret: 'CINEMA', imposter: 'THEATRE' },
  { secret: 'BUS', imposter: 'METRO' },
  // Pop Culture, Cartoons & Characters
  { secret: 'PIKACHU', imposter: 'RAICHU' },
  { secret: 'MICKEY MOUSE', imposter: 'DONALD DUCK' },
  { secret: 'TOM AND JERRY', imposter: 'OGGY AND THE COCKROACHES' },
  { secret: 'DORAEMON', imposter: 'SHIN CHAN' },
  { secret: 'SPIDERMAN', imposter: 'BATMAN' },
  { secret: 'HARRY POTTER', imposter: 'PERCY JACKSON' },
  { secret: 'LUFFY', imposter: 'ZORO' },
  // Bollywood & Hinglish
  { secret: 'SHOLAY', imposter: 'DEEWAAR' },
  { secret: 'SAMOSA', imposter: 'KACHORI' },
  { secret: 'BIRAYANI', imposter: 'PULAO' },
  { secret: 'CHAI', imposter: 'FILTER COFFEE' },
  { secret: 'GOLGAPPA', imposter: 'DAHI PURI' },
  { secret: 'HERA PHERI', imposter: 'DHAMAAL' },
  // Everyday Objects & Utensils
  { secret: 'PRESSURE COOKER', imposter: 'FRYING PAN' },
  { secret: 'MICROWAVE', imposter: 'TOASTER' },
  { secret: 'FORK', imposter: 'SPOON' },
  { secret: 'HEADPHONES', imposter: 'EARBUDS' },
  { secret: 'SMARTPHONE', imposter: 'TABLET' },
  { secret: 'SUNGLASSES', imposter: 'READING GLASSES' },
  { secret: 'WALLET', imposter: 'BACKPACK' },
  { secret: 'NOTEBOOK', imposter: 'DIARY' },
  // Animals & Nature
  { secret: 'WHALE', imposter: 'SHARK' },
  { secret: 'EAGLE', imposter: 'HAWK' },
  { secret: 'PENGUIN', imposter: 'SEAL' },
  { secret: 'RAINBOW', imposter: 'AURORA' },
  { secret: 'VOLCANO', imposter: 'EARTHQUAKE' },
];

export class ImposterEngine {
  static initGame(roomState: RoomState): void {
    const playerIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
    if (playerIds.length < 3) return; // Need at least 3

    for (const id of playerIds) {
      roomState.players[id].score = 0;
    }

    const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
    const imposterIdx = Math.floor(Math.random() * playerIds.length);
    const imposterId = playerIds[imposterIdx];
    const speakerOrder = shuffle([...playerIds]);

    roomState.imposterState = {
      phase: 'clue_giving',
      currentRound: 1,
      totalRounds: roomState.settings.totalRounds || 3,
      imposterId,
      secretWord: pair.secret,
      imposterWord: pair.imposter,
      clues: [],
      currentSpeakerId: speakerOrder[0],
      speakerOrder,
      submittedClueIds: [],
      votes: {},
      voteHistory: {},
      strikes: {},
      eliminatedPlayerIds: [],
      timer: 30,
    };
    roomState.status = 'playing';
  }

  static submitClue(
    roomState: RoomState,
    playerId: string,
    clue: string
  ): boolean {
    const g = roomState.imposterState;
    if (!g || g.phase !== 'clue_giving') return false;
    if (g.currentSpeakerId !== playerId) return false;
    if (g.submittedClueIds.includes(playerId)) return false;

    const cleanClue = clue.trim().split(/\s+/)[0].toUpperCase().slice(0, 30); // one word only
    if (!cleanClue) return false;

    const playerName = roomState.players[playerId]?.name ?? 'Player';
    g.clues.push({ playerId, playerName, clue: cleanClue });
    g.submittedClueIds.push(playerId);

    // Advance speaker
    const playerIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
    const allSubmitted = playerIds.every(id => g.submittedClueIds.includes(id));

    if (allSubmitted) {
      g.phase = 'voting';
      g.votes = {};
      g.timer = 45;
    } else {
      // Next speaker who hasn't gone yet
      const currentIdx = g.speakerOrder.indexOf(playerId);
      for (let i = 1; i <= g.speakerOrder.length; i++) {
        const candidate = g.speakerOrder[(currentIdx + i) % g.speakerOrder.length];
        if (!g.submittedClueIds.includes(candidate) && playerIds.includes(candidate)) {
          g.currentSpeakerId = candidate;
          g.timer = 30;
          break;
        }
      }
    }

    return true;
  }

  static vote(
    roomState: RoomState,
    playerId: string,
    suspectId: string
  ): boolean {
    const g = roomState.imposterState;
    if (!g || g.phase !== 'voting') return false;
    if (suspectId !== 'none' && !roomState.players[suspectId]) return false;
    if (g.eliminatedPlayerIds?.includes(playerId)) return false; // Eliminated players cannot vote

    g.votes[playerId] = suspectId;

    // Check if all connected, non-eliminated players voted
    const activePlayerIds = Object.keys(roomState.players).filter(
      id => roomState.players[id].isConnected && !g.eliminatedPlayerIds?.includes(id)
    );
    const allVoted = activePlayerIds.every(id => g.votes[id] !== undefined);

    if (allVoted) {
      ImposterEngine.resolveVotes(roomState);
    }

    return true;
  }

  private static resolveVotes(roomState: RoomState): void {
    const g = roomState.imposterState;
    if (!g) return;

    // Snapshot vote breakdown for reveal
    g.voteHistory = { ...g.votes };

    if (!g.strikes) g.strikes = {};
    if (!g.eliminatedPlayerIds) g.eliminatedPlayerIds = [];

    const connectedPlayers = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
    // Rule: if <= 3 players, 1 wrong vote eliminates the guesser. If > 3 players, 2 wrong votes eliminates.
    const maxStrikes = connectedPlayers.length <= 3 ? 1 : 2;

    // Tally votes
    const tally: Record<string, number> = {};
    for (const voterId of Object.keys(g.votes)) {
      const suspect = g.votes[voterId];
      tally[suspect] = (tally[suspect] ?? 0) + 1;

      // Check for wrong vote (voting for an innocent player when you are crew; 'none' is a safe skip vote)
      if (voterId !== g.imposterId && suspect !== g.imposterId && suspect !== 'none') {
        g.strikes[voterId] = (g.strikes[voterId] || 0) + 1;
        if (g.strikes[voterId] >= maxStrikes) {
          if (!g.eliminatedPlayerIds.includes(voterId)) {
            g.eliminatedPlayerIds.push(voterId);
          }
        }
      }
    }

    // Find who got most votes
    let maxVotes = 0;
    let mostVotedId = '';
    for (const [id, count] of Object.entries(tally)) {
      if (count > maxVotes) {
        maxVotes = count;
        mostVotedId = id;
      }
    }

    g.phase = 'reveal';
    g.timer = 8;

    if (mostVotedId === g.imposterId) {
      // Imposter caught — give points to crew who correctly voted and are not eliminated
      for (const id of connectedPlayers) {
        if (id !== g.imposterId && g.votes[id] === g.imposterId && !g.eliminatedPlayerIds.includes(id)) {
          if (roomState.players[id]) roomState.players[id].score += 80;
        }
      }
      // Imposter gets a chance to guess the word
      g.timer = 3; // brief reveal then goes to imposter_guess
    } else {
      // Imposter survived!
      g.roundWinner = 'imposter';
      if (roomState.players[g.imposterId]) {
        roomState.players[g.imposterId].score += 100;
      }
      g.timer = 8;
    }
  }

  static imposterGuess(
    roomState: RoomState,
    playerId: string,
    guess: string
  ): boolean {
    const g = roomState.imposterState;
    if (!g || g.phase !== 'imposter_guess') return false;
    if (playerId !== g.imposterId) return false;

    const cleanGuess = guess.trim().toUpperCase().replace(/[^A-Z ]/g, '');
    const cleanSecret = (g.secretWord || '').toUpperCase().replace(/[^A-Z ]/g, '');

    g.imposterGuess = guess.trim();
    g.imposterGuessCorrect = cleanGuess === cleanSecret;

    if (g.imposterGuessCorrect) {
      g.roundWinner = 'imposter';
      if (roomState.players[g.imposterId]) {
        roomState.players[g.imposterId].score += 50;
      }
    } else {
      g.roundWinner = 'crew';
    }

    g.phase = 'round_recap';
    g.timer = 10;
    return true;
  }

  static tick(roomState: RoomState): { phaseChanged: boolean } {
    const g = roomState.imposterState;
    if (!g || roomState.status !== 'playing') return { phaseChanged: false };

    g.timer = Math.max(0, g.timer - 1);

    if (g.phase === 'clue_giving') {
      if (g.timer <= 0) {
        // Auto-submit empty clue for current speaker
        const playerName = roomState.players[g.currentSpeakerId]?.name ?? 'Player';
        if (!g.submittedClueIds.includes(g.currentSpeakerId)) {
          g.clues.push({ playerId: g.currentSpeakerId, playerName, clue: '...' });
          g.submittedClueIds.push(g.currentSpeakerId);
        }
        const playerIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
        const allSubmitted = playerIds.every(id => g.submittedClueIds.includes(id));
        if (allSubmitted) {
          g.phase = 'voting';
          g.votes = {};
          g.timer = 45;
        } else {
          const currentIdx = g.speakerOrder.indexOf(g.currentSpeakerId);
          for (let i = 1; i <= g.speakerOrder.length; i++) {
            const candidate = g.speakerOrder[(currentIdx + i) % g.speakerOrder.length];
            if (!g.submittedClueIds.includes(candidate) && playerIds.includes(candidate)) {
              g.currentSpeakerId = candidate;
              g.timer = 30;
              break;
            }
          }
        }
        return { phaseChanged: true };
      }
      return { phaseChanged: false };
    }

    if (g.phase === 'voting') {
      if (g.timer <= 0) {
        ImposterEngine.resolveVotes(roomState);
        return { phaseChanged: true };
      }
      return { phaseChanged: false };
    }

    if (g.phase === 'reveal') {
      if (g.timer <= 0) {
        // Check if imposter was caught (roundWinner not set = imposter was caught)
        if (!g.roundWinner) {
          g.phase = 'imposter_guess';
          g.timer = 20;
        } else {
          g.phase = 'round_recap';
          g.timer = 10;
        }
        return { phaseChanged: true };
      }
      return { phaseChanged: false };
    }

    if (g.phase === 'imposter_guess') {
      if (g.timer <= 0) {
        // Time's up — crew wins
        g.imposterGuessCorrect = false;
        g.roundWinner = 'crew';
        g.phase = 'round_recap';
        g.timer = 10;
        return { phaseChanged: true };
      }
      return { phaseChanged: false };
    }

    if (g.phase === 'round_recap') {
      if (g.timer <= 0) {
        const playerIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
        if (playerIds.length === 0) {
          roomState.status = 'lobby';
          return { phaseChanged: true };
        }

        if (g.currentRound >= g.totalRounds) {
          g.phase = 'game_over';
          roomState.status = 'game_over';
          g.timer = 12;
          return { phaseChanged: true };
        }

        // Next round
        g.currentRound += 1;
        const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
        const imposterIdx = Math.floor(Math.random() * playerIds.length);
        g.imposterId = playerIds[imposterIdx];
        g.secretWord = pair.secret;
        g.imposterWord = pair.imposter;
        g.speakerOrder = shuffle([...playerIds]);
        g.currentSpeakerId = g.speakerOrder[0];
        g.submittedClueIds = [];
        g.clues = [];
        g.votes = {};
        g.phase = 'clue_giving';
        g.timer = 30;
        delete g.roundWinner;
        delete g.imposterGuess;
        delete g.imposterGuessCorrect;
        return { phaseChanged: true };
      }
      return { phaseChanged: false };
    }

    return { phaseChanged: false };
  }
}

