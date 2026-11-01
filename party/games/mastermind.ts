import {
  RoomState,
  MastermindGameState,
  MastermindPlayerInfo,
  MastermindRole,
  MastermindItem,
} from '../types';

// ------------------------------------------------------------------
// Role assignment tables
// ------------------------------------------------------------------
// Team "syndicate" = bad guys, "town" = good guys, "neutral" = wildcard
const ROLE_POOL: Array<{ role: MastermindRole; team: 'syndicate' | 'town' | 'neutral' }> = [
  { role: 'killer',   team: 'syndicate' },
  { role: 'thief',    team: 'syndicate' },
  { role: 'sheriff',  team: 'town' },
  { role: 'soldier',  team: 'town' },
  { role: 'doctor',   team: 'town' },
  { role: 'joker',    team: 'neutral' },   // +1 at 6 players
  { role: 'wizard',   team: 'neutral' },   // +1 at 7 players
  { role: 'hacker',   team: 'syndicate' }, // +1 at 8 players (intercept ability)
  { role: 'hitman',   team: 'syndicate' }, // +1 at 9 players (hired killer)
  { role: 'judge',    team: 'town' },      // +1 at 10 players (can jail)
];

const ITEM_COSTS: Record<MastermindItem, number> = {
  vest: 50,
  wiretap: 80,
  smoke: 40,
  adrenaline: 60,
  ammo: 70,
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Mini-game: everyone submits a score via MASTERMIND_SUBMIT_MINIGAME_SCORE.
// The server computes cash = (score / targetScore) * baseCash clamped to [10,200].
const BASE_CASH = 150;
const TARGET_SCORE = 100;

export class MastermindEngine {
  // ------------------------------------------------------------------
  // Init
  // ------------------------------------------------------------------
  static initGame(roomState: RoomState): void {
    const playerIds = Object.keys(roomState.players).filter(
      (id) => roomState.players[id].isConnected
    );
    if (playerIds.length < 5) return; // Need at least 5 players

    // Assign roles based on player count
    const numPlayers = playerIds.length;
    const rolesToUse = ROLE_POOL.slice(0, Math.min(numPlayers, ROLE_POOL.length));
    const shuffledRoles = shuffle(rolesToUse);
    const shuffledPlayerIds = shuffle([...playerIds]);

    const mastermindPlayers: Record<string, MastermindPlayerInfo> = {};
    for (let i = 0; i < shuffledPlayerIds.length; i++) {
      const pid = shuffledPlayerIds[i];
      const roleEntry = shuffledRoles[i % shuffledRoles.length];
      mastermindPlayers[pid] = {
        id: pid,
        name: roomState.players[pid].name,
        role: roleEntry.role,
        team: roleEntry.team,
        health: 'healthy',
        cash: 30, // starter cash
        medpacks: 0,
        shields: 0,
        inventory: [],
        bleedRoundsLeft: 0,
        isShieldedThisRound: false,
        wasInvestigated: false,
        selectedAbilityTarget: undefined,
        selectedAbilityType: undefined,
        minigameScore: undefined,
        mvpPoints: 0,
      };
    }

    // Give starting abilities
    MastermindEngine.grantRoundAbilities(mastermindPlayers, 1);

    roomState.mastermindState = {
      phase: 'role_reveal',
      currentRound: 1,
      totalRounds: roomState.settings.totalRounds || 5,
      timer: 12,
      players: mastermindPlayers,
      nightNews: [],
      votes: {},
    };
    roomState.status = 'playing';
  }

  // ------------------------------------------------------------------
  // Grant abilities based on current round
  // ------------------------------------------------------------------
  private static grantRoundAbilities(
    players: Record<string, MastermindPlayerInfo>,
    round: number
  ): void {
    for (const pid of Object.keys(players)) {
      const p = players[pid];
      p.selectedAbilityTarget = undefined;
      p.selectedAbilityType = undefined;
      p.isShieldedThisRound = false;

      if (round === 1) {
        // Round 1: setup powers (no lethal abilities yet)
        if (p.role === 'doctor') p.medpacks = Math.min(p.medpacks + 1, 2);
        if (p.role === 'soldier') p.shields = Math.min(p.shields + 1, 2);
      } else {
        // Round 2+: full arsenal
        if (p.role === 'doctor') p.medpacks = Math.min(p.medpacks + 1, 2);
        if (p.role === 'soldier') p.shields = Math.min(p.shields + 1, 2);
        // Killer, Sheriff, Thief, Joker, Wizard, Hacker abilities are used via MASTERMIND_USE_ABILITY
      }
    }
  }

  // ------------------------------------------------------------------
  // Message handlers
  // ------------------------------------------------------------------
  static submitMinigameScore(roomState: RoomState, playerId: string, score: number): boolean {
    const g = roomState.mastermindState;
    if (!g || g.phase !== 'minigame') return false;
    const p = g.players[playerId];
    if (!p) return false;

    p.minigameScore = Math.max(0, Math.min(9999, score));
    return true;
  }

  static buyItem(roomState: RoomState, playerId: string, item: MastermindItem): boolean {
    const g = roomState.mastermindState;
    if (!g || g.phase !== 'shop') return false;
    const p = g.players[playerId];
    if (!p) return false;

    const cost = ITEM_COSTS[item] ?? 50;
    if (p.cash < cost) return false;
    if (p.inventory.length >= 3) return false; // Max 3 items

    p.cash -= cost;
    p.inventory.push(item);
    return true;
  }

  static useAbility(
    roomState: RoomState,
    playerId: string,
    abilityType: string,
    targetId?: string
  ): boolean {
    const g = roomState.mastermindState;
    if (!g || g.phase !== 'night_ability') return false;
    const p = g.players[playerId];
    if (!p || p.health === 'dead') return false;

    p.selectedAbilityType = abilityType;
    p.selectedAbilityTarget = targetId;
    return true;
  }

  static vote(roomState: RoomState, playerId: string, suspectId: string): boolean {
    const g = roomState.mastermindState;
    if (!g || g.phase !== 'deliberation_vote') return false;
    if (!g.players[suspectId] && suspectId !== 'skip') return false;

    g.votes[playerId] = suspectId;

    // Check if all living players voted
    const livingIds = Object.keys(g.players).filter((id) => g.players[id].health !== 'dead');
    if (livingIds.every((id) => g.votes[id] !== undefined)) {
      MastermindEngine.resolveVote(roomState);
    }
    return true;
  }

  // ------------------------------------------------------------------
  // Night resolution
  // ------------------------------------------------------------------
  private static resolveNight(roomState: RoomState): void {
    const g = roomState.mastermindState;
    if (!g) return;

    const news: string[] = [];
    const players = g.players;

    // Collect all wound/kill actions
    const woundTargets: Record<string, string[]> = {}; // targetId -> [shooterIds]
    const stolenFrom: Record<string, { byId: string; amount: number }[]> = {};
    let investigatedId: string | undefined;
    let investigatorId: string | undefined;
    let hackedAbilityId: string | undefined;
    let jailedId: string | undefined;

    // Collect ability selections
    for (const pid of Object.keys(players)) {
      const p = players[pid];
      if (!p.selectedAbilityType) continue;
      const tId = p.selectedAbilityTarget;

      switch (p.role) {
        case 'killer':
          if (p.selectedAbilityType === 'shoot' && tId && players[tId]) {
            if (!woundTargets[tId]) woundTargets[tId] = [];
            woundTargets[tId].push(pid);
          } else if (p.selectedAbilityType === 'steal_cash' && tId && players[tId]) {
            const amt = Math.floor(players[tId].cash * 0.3);
            if (!stolenFrom[tId]) stolenFrom[tId] = [];
            stolenFrom[tId].push({ byId: pid, amount: amt });
          }
          break;
        case 'thief':
          if ((p.selectedAbilityType === 'steal_cash' || p.selectedAbilityType === 'rob') && tId && players[tId]) {
            const amt = p.selectedAbilityType === 'rob'
              ? players[tId].cash
              : Math.floor(players[tId].cash * 0.4);
            if (!stolenFrom[tId]) stolenFrom[tId] = [];
            stolenFrom[tId].push({ byId: pid, amount: amt });
          }
          break;
        case 'sheriff':
          if (p.selectedAbilityType === 'investigate' && tId) {
            investigatedId = tId;
            investigatorId = pid;
          } else if (p.selectedAbilityType === 'shoot' && tId && players[tId]) {
            if (!woundTargets[tId]) woundTargets[tId] = [];
            woundTargets[tId].push(pid);
          }
          break;
        case 'soldier':
          if (p.selectedAbilityType === 'shield' && tId && players[tId]) {
            players[tId].isShieldedThisRound = true;
          }
          break;
        case 'doctor':
          if (p.selectedAbilityType === 'heal_one' && tId && players[tId]) {
            const target = players[tId];
            if (target.health === 'wounded' && p.medpacks >= 1) {
              p.medpacks -= 1;
              target.bleedRoundsLeft = 1; // healed for 1 round
              news.push(`💉 A medpack was used to stabilize someone.`);
            }
          } else if (p.selectedAbilityType === 'revive' && tId && players[tId]) {
            const target = players[tId];
            if (target.health === 'dead' && p.medpacks >= 2) {
              p.medpacks -= 2;
              target.health = 'healthy';
              target.bleedRoundsLeft = 0;
              news.push(`✨ Someone was revived from the dead!`);
            }
          }
          break;
        case 'hacker':
          if (p.selectedAbilityType === 'intercept' && tId) {
            hackedAbilityId = tId; // This player's night action is nullified
          }
          break;
        case 'wizard':
          if (p.selectedAbilityType === 'revive' && tId && players[tId]) {
            const target = players[tId];
            if (target.health === 'dead') {
              target.health = 'healthy';
              target.bleedRoundsLeft = 0;
              news.push(`🔮 A wizard has resurrected someone!`);
            }
          } else if (p.selectedAbilityType === 'kill' && tId && players[tId]) {
            if (!woundTargets[tId]) woundTargets[tId] = [];
            woundTargets[tId].push(pid);
            woundTargets[tId].push(pid); // wizard kill = double wound = instant death
          }
          break;
        case 'judge':
          if (p.selectedAbilityType === 'jail' && tId) {
            jailedId = tId;
          }
          break;
        case 'joker':
          // Joker's swap ability handled at kill-check time below
          break;
      }
    }

    // Apply hacker (null one person's action)
    if (hackedAbilityId && players[hackedAbilityId]) {
      players[hackedAbilityId].selectedAbilityType = undefined;
      players[hackedAbilityId].selectedAbilityTarget = undefined;
      news.push(`💻 The Hacker intercepted someone's night ability!`);
    }

    // Apply jail (jailed player's ability is nullified)
    if (jailedId) {
      g.jailedPlayerId = jailedId;
      if (players[jailedId]) {
        players[jailedId].selectedAbilityType = undefined;
        news.push(`⚖️ The Judge has jailed a suspect for the night!`);
      }
    }

    // Apply steals
    for (const [targetId, thefts] of Object.entries(stolenFrom)) {
      const t = players[targetId];
      if (!t) continue;
      let totalStolen = 0;
      for (const { byId, amount } of thefts) {
        const actualAmt = Math.min(amount, t.cash - totalStolen);
        if (actualAmt > 0) {
          players[byId].cash += actualAmt;
          totalStolen += actualAmt;
        }
      }
      if (totalStolen > 0) {
        t.cash = Math.max(0, t.cash - totalStolen);
        news.push(`💰 Someone was robbed of \$${totalStolen} in the night!`);
      }
    }

    // Apply wounds/kills
    for (const [targetId, shooters] of Object.entries(woundTargets)) {
      const t = players[targetId];
      if (!t || t.health === 'dead') continue;

      // Shield blocks one hit
      if (t.isShieldedThisRound) {
        news.push(`🛡️ Someone's shield blocked the attack!`);
        t.isShieldedThisRound = false;

        // Vest (inventory) blocks additional hit
        const vestIdx = t.inventory.indexOf('vest');
        if (vestIdx !== -1 && shooters.length > 1) {
          t.inventory.splice(vestIdx, 1);
          news.push(`🦺 A bulletproof vest absorbed an extra shot!`);
        }
        continue;
      }

      // Vest blocks first hit
      const vestIdx = t.inventory.indexOf('vest');
      if (vestIdx !== -1) {
        t.inventory.splice(vestIdx, 1);
        news.push(`🦺 A bulletproof vest saved someone from getting hurt!`);
        continue;
      }

      const numShots = shooters.length;
      if (numShots >= 2) {
        // Joker swap: if joker is targeted with lethal shots, check joker power
        if (t.role === 'joker') {
          const jokerAbility = t.selectedAbilityType;
          if (jokerAbility === 'swap') {
            const swapTargetId = t.selectedAbilityTarget;
            if (swapTargetId && players[swapTargetId]) {
              // Joker swaps place — if killed by bad guys, joker wins (and survives)
              const isKilledByBadGuy = shooters.some(s => players[s]?.team === 'syndicate');
              if (isKilledByBadGuy) {
                news.push(`🃏 The Joker performed a daring swap and survived!`);
                // Apply death to the swapped person instead
                players[swapTargetId].health = 'wounded';
                news.push(`💀 The Joker's swap target took the hit!`);
              } else {
                // Killed by town → joker dies
                t.health = 'dead';
                news.push(`🃏 The Joker gambled and lost...`);
              }
            } else {
              t.health = 'dead';
              news.push(`💀 A player was eliminated tonight!`);
            }
          } else {
            t.health = 'dead';
            news.push(`💀 A player was eliminated tonight!`);
          }
        } else {
          // Normal player: 2+ shots = dead
          if (t.health === 'wounded') {
            t.health = 'dead';
            news.push(`💀 A wounded player was finished off!`);
          } else {
            t.health = 'dead';
            news.push(`💀 A player was eliminated tonight!`);
          }
        }
      } else {
        // 1 shot = wounded
        if (t.health === 'healthy') {
          t.health = 'wounded';
          t.bleedRoundsLeft = 2;
          news.push(`🩸 Someone was wounded but clings to life...`);
        } else if (t.health === 'wounded') {
          // Already wounded: second shot kills
          t.health = 'dead';
          news.push(`💀 A wounded player succumbed to their injuries!`);
        }
      }
    }

    // Investigate result (revealed only to sheriff)
    if (investigatedId && investigatorId && players[investigatedId]) {
      const suspect = players[investigatedId];
      suspect.wasInvestigated = true;
      suspect.investigationResult = suspect.team === 'syndicate' ? 'Suspicious' : 'Innocent';
      // Sheriff's private info — news item is generic
      news.push(`🔍 The Sheriff investigated someone last night.`);
    }

    // Award MVP points for minigame
    MastermindEngine.processMiniGameResults(g);

    g.nightNews = news;
    g.votes = {};
    g.jailedPlayerId = undefined;
  }

  private static processMiniGameResults(g: MastermindGameState): void {
    let topScore = -1;
    let mvpId: string | undefined;

    for (const [pid, p] of Object.entries(g.players)) {
      if (p.health === 'dead') continue;
      const score = p.minigameScore ?? 0;
      const cashEarned = Math.round(
        Math.max(10, Math.min(200, (score / TARGET_SCORE) * BASE_CASH))
      );
      p.cash += cashEarned;
      p.mvpPoints += score;
      p.minigameScore = undefined;

      if (score > topScore) {
        topScore = score;
        mvpId = pid;
      }
    }

    if (mvpId) {
      g.mvpPlayerId = mvpId;
      g.players[mvpId].cash += 30; // MVP bonus cash
    }
  }

  private static resolveVote(roomState: RoomState): void {
    const g = roomState.mastermindState;
    if (!g) return;

    const tally: Record<string, number> = {};
    for (const suspectId of Object.values(g.votes)) {
      if (suspectId !== 'skip') tally[suspectId] = (tally[suspectId] ?? 0) + 1;
    }

    let maxVotes = 0;
    let eliminatedId: string | undefined;
    for (const [id, count] of Object.entries(tally)) {
      if (count > maxVotes) {
        maxVotes = count;
        eliminatedId = id;
      }
    }

    if (eliminatedId && g.players[eliminatedId]) {
      g.players[eliminatedId].health = 'dead';
    }

    // Check win conditions
    MastermindEngine.checkWinCondition(roomState);
    if (roomState.status !== 'game_over') {
      g.phase = 'morning_news';
      g.timer = 10;
    }
  }

  private static checkWinCondition(roomState: RoomState): void {
    const g = roomState.mastermindState;
    if (!g) return;

    const living = Object.values(g.players).filter((p) => p.health !== 'dead');
    const livingSyndicate = living.filter((p) => p.team === 'syndicate');
    const livingTown = living.filter((p) => p.team === 'town');
    const livingJoker = living.filter((p) => p.role === 'joker');

    // Syndicate wins if they equal or outnumber town
    if (livingSyndicate.length >= livingTown.length && livingSyndicate.length > 0) {
      g.winner = 'syndicate';
      g.phase = 'game_over';
      roomState.status = 'game_over';
      g.timer = 15;
    }
    // Town wins if all syndicate are dead
    else if (livingSyndicate.length === 0) {
      g.winner = 'town';
      g.phase = 'game_over';
      roomState.status = 'game_over';
      g.timer = 15;
    }
    // Joker wins if only joker is left alive
    else if (livingJoker.length > 0 && living.length === livingJoker.length) {
      g.winner = 'joker';
      g.phase = 'game_over';
      roomState.status = 'game_over';
      g.timer = 15;
    }
    // Check if total rounds exceeded
    else if (g.currentRound >= g.totalRounds) {
      g.winner = livingSyndicate.length > 0 ? 'syndicate' : 'town';
      g.phase = 'game_over';
      roomState.status = 'game_over';
      g.timer = 15;
    }
  }

  // ------------------------------------------------------------------
  // Tick (called every second)
  // ------------------------------------------------------------------
  static tick(roomState: RoomState): { phaseChanged: boolean } {
    const g = roomState.mastermindState;
    if (!g || roomState.status !== 'playing') return { phaseChanged: false };

    g.timer = Math.max(0, g.timer - 1);

    // role_reveal → minigame
    if (g.phase === 'role_reveal' && g.timer <= 0) {
      g.phase = 'minigame';
      g.timer = roomState.settings.mastermindMiniGameTime ?? 60;
      return { phaseChanged: true };
    }

    // minigame → shop
    if (g.phase === 'minigame' && g.timer <= 0) {
      g.phase = 'shop';
      g.timer = 35;
      return { phaseChanged: true };
    }

    // shop → night_ability
    if (g.phase === 'shop' && g.timer <= 0) {
      g.phase = 'night_ability';
      g.timer = roomState.settings.mastermindAbilityTime ?? 20;
      return { phaseChanged: true };
    }

    // night_ability → morning_news (after resolving)
    if (g.phase === 'night_ability' && g.timer <= 0) {
      MastermindEngine.resolveNight(roomState);
      MastermindEngine.checkWinCondition(roomState);
      if ((g.phase as string) === 'game_over') return { phaseChanged: true };
      g.phase = 'morning_news';
      g.timer = 12;
      return { phaseChanged: true };
    }

    // morning_news → deliberation_vote or next round minigame
    if (g.phase === 'morning_news' && g.timer <= 0) {
      g.phase = 'deliberation_vote';
      g.votes = {};
      g.timer = 45;
      return { phaseChanged: true };
    }

    // deliberation_vote → next round (or game over)
    if (g.phase === 'deliberation_vote' && g.timer <= 0) {
      MastermindEngine.resolveVote(roomState);
      if ((g.phase as string) === 'game_over') return { phaseChanged: true };
      // Start next round
      MastermindEngine.startNextRound(roomState);
      return { phaseChanged: true };
    }

    return { phaseChanged: false };
  }

  private static startNextRound(roomState: RoomState): void {
    const g = roomState.mastermindState;
    if (!g) return;
    g.currentRound += 1;
    MastermindEngine.grantRoundAbilities(g.players, g.currentRound);
    g.phase = 'minigame';
    g.timer = roomState.settings.mastermindMiniGameTime ?? 60;
    g.nightNews = [];
    g.mvpPlayerId = undefined;
  }
}

