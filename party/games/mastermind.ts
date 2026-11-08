import {
  RoomState,
  MastermindGameState,
  MastermindPlayerInfo,
  MastermindRole,
  MastermindItem,
  AuctionSlot,
  MastermindNewsEvent,
  MastermindMiniGameId,
} from '../types';

// ------------------------------------------------------------------
// Role Sequence (Ordered strictly as requested by User)
// 1. Sheriff, 2. Killer, 3. Doctor, 4. Thief, 5. Soldier,
// 6. Joker (+1 at 6), 7. Wizard (+1 at 7), 8. Hacker (+1 at 8)
// ------------------------------------------------------------------
const ROLE_SEQUENCE: Array<{ role: MastermindRole; team: 'syndicate' | 'town' | 'neutral' }> = [
  { role: 'sheriff', team: 'town' },
  { role: 'killer',  team: 'syndicate' },
  { role: 'doctor',  team: 'town' },
  { role: 'thief',   team: 'syndicate' },
  { role: 'soldier', team: 'town' },
  { role: 'joker',   team: 'neutral' },   // 6th player
  { role: 'wizard',  team: 'neutral' },   // 7th player
  { role: 'hacker',  team: 'syndicate' }, // 8th player
];

const ANONYMOUS_AVATARS = [
  { avatar: '🔷', color: '#38bdf8' },
  { avatar: '🔴', color: '#f43f5e' },
  { avatar: '🟢', color: '#10b981' },
  { avatar: '🟣', color: '#a855f7' },
  { avatar: '🟡', color: '#eab308' },
  { avatar: '🟠', color: '#f97316' },
  { avatar: '⚪', color: '#e2e8f0' },
  { avatar: '🟤', color: '#a16207' },
];

const AUCTION_CATALOG: Array<{ item: MastermindItem; name: string; type: 'component' | 'tier1' | 'tier2'; basePrice: number }> = [
  // Raw Components
  { item: 'chemical_solvent', name: 'Chemical Solvent', type: 'component', basePrice: 12 },
  { item: 'battery', name: 'High-Voltage Battery', type: 'component', basePrice: 15 },
  { item: 'micro_cipher', name: 'Micro-Cipher Chip', type: 'component', basePrice: 15 },
  { item: 'volatile_powder', name: 'Volatile Powder', type: 'component', basePrice: 14 },
  { item: 'steel_frame', name: 'Reinforced Steel Frame', type: 'component', basePrice: 15 },
  { item: 'bio_sample', name: 'Bio-Sample Vial', type: 'component', basePrice: 14 },
  { item: 'scrap_metal', name: 'Scrap Metal Plate', type: 'component', basePrice: 10 },
  { item: 'duct_tape', name: 'Duct Tape & Rags', type: 'component', basePrice: 10 },
  { item: 'flashlight', name: 'Pocket Flashlight', type: 'component', basePrice: 10 },
  { item: 'discarded_key', name: 'Discarded Key', type: 'component', basePrice: 12 },
  { item: 'chemical_residue', name: 'Chemical Residue', type: 'component', basePrice: 10 },
  { item: 'glass_wire', name: 'Glass Jar & Wire', type: 'component', basePrice: 10 },
  // Tier 1 Tactical
  { item: 'optical_scanner', name: 'Optical Scanner', type: 'tier1', basePrice: 35 },
  { item: 'corrosive_lockpick', name: 'Corrosive Lockpick', type: 'tier1', basePrice: 35 },
  { item: 'improvised_kevlar', name: 'Improvised Kevlar', type: 'tier1', basePrice: 35 },
  { item: 'tripwire_mine', name: 'Tripwire Mine', type: 'tier1', basePrice: 35 },
  // Tier 2 High-Value
  { item: 'laser_wiretap', name: 'Laser Wiretap', type: 'tier2', basePrice: 65 },
  { item: 'half_antidote', name: 'Half-Made Antidote', type: 'tier2', basePrice: 65 },
  { item: 'half_detonator', name: 'Half-Made Detonator', type: 'tier2', basePrice: 65 },
  { item: 'master_lockpick', name: 'Master Lockpick', type: 'tier2', basePrice: 65 },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class MastermindEngine {
  // ------------------------------------------------------------------
  // Init Game
  // ------------------------------------------------------------------
  static initGame(roomState: RoomState): void {
    const playerIds = Object.keys(roomState.players).filter(
      (id) => roomState.players[id].isConnected
    );

    // Auto-fill missing slots with AI bots so even 1 player solo can test
    const BOT_PRESETS = [
      { name: 'Operative-Alpha (Bot)', avatar: '🤖' },
      { name: 'Operative-Beta (Bot)', avatar: '🕵️' },
      { name: 'Operative-Gamma (Bot)', avatar: '🦾' },
      { name: 'Operative-Delta (Bot)', avatar: '⚡' },
      { name: 'Operative-Epsilon (Bot)', avatar: '💻' },
    ];

    let botIdx = 0;
    while (playerIds.length < 5 && botIdx < BOT_PRESETS.length) {
      const botId = `bot_${botIdx + 1}`;
      const preset = BOT_PRESETS[botIdx];
      roomState.players[botId] = {
        id: botId,
        name: preset.name,
        avatar: preset.avatar,
        isHost: false,
        isReady: true,
        score: 0,
        isConnected: true,
      };
      playerIds.push(botId);
      botIdx++;
    }

    if (playerIds.length < 5) return;

    const numPlayers = playerIds.length;
    const rolesToUse = ROLE_SEQUENCE.slice(0, Math.min(numPlayers, ROLE_SEQUENCE.length));
    const shuffledRoles = shuffle(rolesToUse);
    const shuffledPlayerIds = shuffle([...playerIds]);

    const mastermindPlayers: Record<string, MastermindPlayerInfo> = {};
    for (let i = 0; i < shuffledPlayerIds.length; i++) {
      const pid = shuffledPlayerIds[i];
      const roleEntry = shuffledRoles[i % shuffledRoles.length];
      const av = ANONYMOUS_AVATARS[i % ANONYMOUS_AVATARS.length];

      mastermindPlayers[pid] = {
        id: pid,
        name: `Operative-${String(i + 1).padStart(2, '0')}`,
        avatar: av.avatar,
        color: av.color,
        role: roleEntry.role,
        team: roleEntry.team,
        health: 'healthy',
        coins: 50,
        cash: 50,
        unlockedNormalAbilities: false, // Claimable in Round 1
        wonAuctionLastRound: false,
        inventory: ['scrap_metal'], // Starter raw component
        sectorId: 'lockdown_dome',
        powerPoolMW: 100,
        decadeLockouts: [],
        mvpPoints: 0,
        medpacks: roleEntry.role === 'doctor' ? 1 : 0,
        shields: roleEntry.role === 'soldier' ? 1 : 0,
      };
    }

    roomState.mastermindState = {
      phase: 'role_reveal',
      currentRound: 1,
      totalRounds: roomState.settings.totalRounds || 5,
      timer: 10,
      currentMiniGame: 'power_split',
      players: mastermindPlayers,
      auctionSlots: MastermindEngine.generateAuctionSlots(1),
      auctionBids: {},
      newsSlides: [
        {
          id: 'welcome',
          headline: 'Oakhaven Protocol Initialized',
          detail: 'Operatives dispatched to containment sectors. All external radio channels scrambled.',
          icon: '🚨',
          severity: 'info',
        },
      ],
      vaultBreaches: { vault_1: false, vault_2: false, vault_3: false, vault_4: false },
      domeFortified: false,
      panaceaProgress: 0,
      detonationArmed: false,
      nightNews: [],
      votes: {},
    };

    roomState.status = 'playing';
  }

  // ------------------------------------------------------------------
  // Auction Slot Generation (1 High-Value Slot, 2-3 Components)
  // ------------------------------------------------------------------
  private static generateAuctionSlots(round: number): AuctionSlot[] {
    const highTier = AUCTION_CATALOG.filter((i) => i.type === 'tier2');
    const lowTier = AUCTION_CATALOG.filter((i) => i.type === 'component' || i.type === 'tier1');

    const chosenHigh = highTier[Math.floor(Math.random() * highTier.length)];
    const chosenLow1 = lowTier[Math.floor(Math.random() * lowTier.length)];
    const chosenLow2 = lowTier[Math.floor(Math.random() * lowTier.length)];

    return [
      {
        id: `slot_high_${round}`,
        item: chosenHigh.item,
        name: chosenHigh.name,
        type: chosenHigh.type,
        basePrice: chosenHigh.basePrice,
      },
      {
        id: `slot_low1_${round}`,
        item: chosenLow1.item,
        name: chosenLow1.name,
        type: chosenLow1.type,
        basePrice: chosenLow1.basePrice,
      },
      {
        id: `slot_low2_${round}`,
        item: chosenLow2.item,
        name: chosenLow2.name,
        type: chosenLow2.type,
        basePrice: chosenLow2.basePrice,
      },
    ];
  }

  // ------------------------------------------------------------------
  // Client Message Handlers
  // ------------------------------------------------------------------
  static submitMinigameScore(roomState: RoomState, playerId: string, score: number): boolean {
    const g = roomState.mastermindState;
    if (!g || g.phase !== 'minigame') return false;
    const p = g.players[playerId];
    if (!p) return false;

    p.minigameScore = Math.max(0, Math.min(9999, score));
    return true;
  }

  static claimFreeCards(roomState: RoomState, playerId: string): boolean {
    const g = roomState.mastermindState;
    if (!g) return false;
    const p = g.players[playerId];
    if (!p) return false;

    p.unlockedNormalAbilities = true;
    return true;
  }

  static bidAuction(roomState: RoomState, playerId: string, slotId: string, bidAmount: number): boolean {
    const g = roomState.mastermindState;
    if (!g || g.phase !== 'shop_and_craft') return false;
    const p = g.players[playerId];
    if (!p) return false;

    const multiplier = p.wonAuctionLastRound ? 1.2 : 1.0;
    const effectiveCost = Math.round(bidAmount * multiplier);
    if (p.coins < effectiveCost) return false;

    g.auctionBids[playerId] = { slotId, bidAmount: effectiveCost };
    return true;
  }

  static craftItem(roomState: RoomState, playerId: string, resultItem: MastermindItem): boolean {
    const g = roomState.mastermindState;
    if (!g) return false;
    const p = g.players[playerId];
    if (!p) return false;

    p.inventory.push(resultItem);
    return true;
  }

  // Legacy compat alias (from party/index.ts)
  static buyItem(roomState: RoomState, playerId: string, item: MastermindItem): boolean {
    return MastermindEngine.craftItem(roomState, playerId, item);
  }

  // Legacy compat alias - vote tracking for round table
  static vote(roomState: RoomState, playerId: string, suspectId: string): boolean {
    const g = roomState.mastermindState;
    if (!g) return false;
    g.votes[playerId] = suspectId;
    return true;
  }

  static useAbility(
    roomState: RoomState,
    playerId: string,
    abilityType: string,
    targetId?: string
  ): boolean {
    const g = roomState.mastermindState;
    if (!g || g.phase !== 'round_table_meeting') return false;
    const p = g.players[playerId];
    if (!p || p.health === 'dead' || p.isLockedOut) return false;

    p.selectedAbilityType = abilityType;
    p.selectedAbilityTarget = targetId;
    return true;
  }

  // ------------------------------------------------------------------
  // Tick Loop
  // ------------------------------------------------------------------
  static tick(roomState: RoomState): { phaseChanged: boolean } {
    const g = roomState.mastermindState;
    if (!g || roomState.status !== 'playing') return { phaseChanged: false };

    g.timer = Math.max(0, g.timer - 1);

    // 1. role_reveal -> Phase 1: minigame
    if (g.phase === 'role_reveal' && g.timer <= 0) {
      g.phase = 'minigame';
      g.timer = 50;
      return { phaseChanged: true };
    }

    // 2. minigame -> Phase 2: round_table_meeting
    if (g.phase === 'minigame' && g.timer <= 0) {
      MastermindEngine.resolveMinigame(g);
      g.phase = 'round_table_meeting';
      g.timer = 25;
      return { phaseChanged: true };
    }

    // 3. round_table_meeting -> Phase 3: shop_and_craft
    if (g.phase === 'round_table_meeting' && g.timer <= 0) {
      MastermindEngine.autoAssignBotAbilities(g);
      MastermindEngine.resolveAbilities(roomState);
      g.phase = 'shop_and_craft';
      g.timer = 35;
      return { phaseChanged: true };
    }

    // 4. shop_and_craft -> Phase 4: news_gazette
    if (g.phase === 'shop_and_craft' && g.timer <= 0) {
      MastermindEngine.resolveAuctionBids(g);
      MastermindEngine.checkWinCondition(roomState);
      if ((g.phase as string) === 'game_over') return { phaseChanged: true };
      g.phase = 'news_gazette';
      g.timer = 14;
      return { phaseChanged: true };
    }

    // 5. news_gazette -> Next Round Phase 1: minigame (or Game Over)
    if (g.phase === 'news_gazette' && g.timer <= 0) {
      if (g.currentRound >= g.totalRounds) {
        MastermindEngine.checkWinCondition(roomState, true);
        return { phaseChanged: true };
      }

      MastermindEngine.advanceNextRound(g);
      return { phaseChanged: true };
    }

    return { phaseChanged: false };
  }

  // ------------------------------------------------------------------
  // Mini-Game Scoring & Coin Distribution
  // ------------------------------------------------------------------
  private static resolveMinigame(g: MastermindGameState): void {
    for (const p of Object.values(g.players)) {
      if (p.health === 'dead') continue;
      const score = p.minigameScore ?? Math.floor(40 + Math.random() * 55);
      const earnedCoins = Math.round(Math.max(20, Math.min(140, (score / 150) * 100)));
      p.coins += earnedCoins;
      p.cash = p.coins;
      p.minigameScore = undefined;
    }
  }

  // ------------------------------------------------------------------
  // Bot Autonomous Ability Selection
  // ------------------------------------------------------------------
  private static autoAssignBotAbilities(g: MastermindGameState): void {
    const living = Object.values(g.players).filter((p) => p.health !== 'dead');
    const allLivingIds = living.map((p) => p.id);

    for (const bot of living.filter((p) => p.id.startsWith('bot_'))) {
      if (bot.selectedAbilityType) continue;

      const otherTargets = allLivingIds.filter((id) => id !== bot.id);
      if (otherTargets.length === 0) continue;
      const randomTarget = otherTargets[Math.floor(Math.random() * otherTargets.length)];

      switch (bot.role) {
        case 'killer':
          bot.selectedAbilityType = g.currentRound === 1 ? 'steal_half' : 'gun';
          bot.selectedAbilityTarget = randomTarget;
          break;
        case 'thief':
          bot.selectedAbilityType = g.currentRound === 1 ? 'pocket_raid' : 'steal_full';
          bot.selectedAbilityTarget = randomTarget;
          break;
        case 'sheriff':
          bot.selectedAbilityType = g.currentRound === 1 ? 'investigate' : 'service_pistol';
          bot.selectedAbilityTarget = randomTarget;
          break;
        case 'soldier':
          bot.selectedAbilityType = 'shield';
          bot.selectedAbilityTarget = Math.random() < 0.5 ? bot.id : randomTarget;
          break;
        case 'doctor':
          bot.selectedAbilityType = 'first_aid';
          bot.selectedAbilityTarget = randomTarget;
          break;
        default:
          bot.selectedAbilityType = 'normal1';
          bot.selectedAbilityTarget = randomTarget;
          break;
      }
    }
  }

  // ------------------------------------------------------------------
  // Ability Resolution (Generates Anonymous Gazette Slideshow Events)
  // ------------------------------------------------------------------
  private static resolveAbilities(roomState: RoomState): void {
    const g = roomState.mastermindState;
    if (!g) return;

    const slides: MastermindNewsEvent[] = [];
    const players = g.players;

    // Defensive & Shields first
    for (const p of Object.values(players)) {
      if (p.selectedAbilityType === 'shield' || p.selectedAbilityType === 'normal1' && p.role === 'soldier') {
        const tId = p.selectedAbilityTarget || p.id;
        if (players[tId]) {
          players[tId].isShieldedThisRound = true;
          slides.push({
            id: `shield_${Date.now()}_${Math.random()}`,
            headline: 'Defensive Nanite Barrier Deployed',
            detail: 'An operative projected a reinforced energy shield over a targeted sector.',
            icon: '🛡️',
            severity: 'info',
          });
        }
      }
    }

    // Offensive Strikes (Service Pistol, Gun, Steal)
    for (const p of Object.values(players)) {
      const ability = p.selectedAbilityType;
      const tId = p.selectedAbilityTarget;
      if (!ability || !tId || !players[tId]) continue;
      const target = players[tId];

      if (ability === 'service_pistol' || ability === 'normal2' && p.role === 'sheriff') {
        if (target.isShieldedThisRound) {
          target.isShieldedThisRound = false;
          slides.push({
            id: `hit_shield_${Math.random()}`,
            headline: 'Ballistic Discharge Intercepted',
            detail: 'Gunfire was discharged in the facility corridors, but a defensive shield absorbed the impact!',
            icon: '🛡️',
            severity: 'warning',
          });
        } else {
          target.health = target.health === 'healthy' ? 'wounded' : 'critical';
          slides.push({
            id: `wound_${Math.random()}`,
            headline: 'Operative Wounded in Ballistic Incident',
            detail: 'Forensic telemetry confirms a 9mm round penetrated an operative casing. Target is bleeding.',
            icon: '🩸',
            severity: 'danger',
          });
        }
      } else if (ability === 'gun' || ability === 'normal2' && p.role === 'killer') {
        if (target.isShieldedThisRound) {
          target.isShieldedThisRound = false;
          slides.push({
            id: `killer_shield_${Math.random()}`,
            headline: 'Hostile Strike Deflected',
            detail: 'A lethal ambush was neutralized by an active barrier.',
            icon: '🛡️',
            severity: 'warning',
          });
        } else {
          target.health = target.health === 'healthy' ? 'wounded' : 'critical';
          slides.push({
            id: `killer_wound_${Math.random()}`,
            headline: 'Covert Aggression Detected',
            detail: 'An unregistered weapon discharge left forensic shrapnel across the sector floor.',
            icon: '🩸',
            severity: 'critical',
          });
        }
      } else if (ability === 'first_aid' || ability === 'normal1' && p.role === 'doctor') {
        if (target.health === 'wounded') {
          target.health = 'healthy';
          slides.push({
            id: `heal_${Math.random()}`,
            headline: 'Triage First Aid Administered',
            detail: 'Medical field dressings stabilized a wounded operative back to operational status.',
            icon: '🩹',
            severity: 'info',
          });
        }
      } else if (ability === 'lockout_arrest' || ability === 'ultimate' && p.role === 'sheriff') {
        target.isLockedOut = true;
        slides.push({
          id: `lockout_${Math.random()}`,
          headline: 'High-Security Detention Enforced',
          detail: 'An operative was restrained in quarantine; electronic trading & ability channels revoked.',
          icon: '⛓️',
          severity: 'warning',
        });
      }
    }

    if (slides.length === 0) {
      slides.push({
        id: `silent_${Date.now()}`,
        headline: 'Silent Shelter Reconnaissance',
        detail: 'Operatives observed each other at the Round Table. No weapons were fired tonight.',
        icon: '🤫',
        severity: 'info',
      });
    }

    g.newsSlides = slides;
  }

  // ------------------------------------------------------------------
  // Auction Resolution (Single Purchase Limit & Wealth Tax)
  // ------------------------------------------------------------------
  private static resolveAuctionBids(g: MastermindGameState): void {
    // Reset wealth tax flags for everyone initially
    for (const p of Object.values(g.players)) {
      p.wonAuctionLastRound = false;
    }

    // Process highest bid per slot, respecting single-purchase limit
    const winners: Record<string, boolean> = {}; // playerId -> hasWonItem

    for (const slot of g.auctionSlots) {
      let highestBid = 0;
      let highestBidderId: string | undefined;

      for (const [pid, bid] of Object.entries(g.auctionBids)) {
        if (bid.slotId === slot.id && bid.bidAmount > highestBid && !winners[pid]) {
          highestBid = bid.bidAmount;
          highestBidderId = pid;
        }
      }

      if (highestBidderId && g.players[highestBidderId]) {
        const winner = g.players[highestBidderId];
        winner.coins = Math.max(0, winner.coins - highestBid);
        winner.cash = winner.coins;
        winner.inventory.push(slot.item);
        winner.wonAuctionLastRound = true; // Subject to +20% wealth tax next round
        winners[highestBidderId] = true;
      }
    }

    g.auctionBids = {};
  }

  // ------------------------------------------------------------------
  // Advance Next Round
  // ------------------------------------------------------------------
  private static advanceNextRound(g: MastermindGameState): void {
    g.currentRound += 1;
    // Rotate mini game: Round 1 -> power_split, Round 2 -> cyber_cipher, Round 3 -> leverage_pool
    const miniGames: MastermindMiniGameId[] = ['power_split', 'cyber_cipher', 'leverage_pool'];
    g.currentMiniGame = miniGames[(g.currentRound - 1) % miniGames.length];
    g.phase = 'minigame';
    g.timer = 50;
    g.auctionSlots = MastermindEngine.generateAuctionSlots(g.currentRound);

    // Clear one-round status effects
    for (const p of Object.values(g.players)) {
      p.isShieldedThisRound = false;
      p.isLockedOut = false;
      p.selectedAbilityType = undefined;
      p.selectedAbilityTarget = undefined;
    }
  }

  // ------------------------------------------------------------------
  // Win Condition Check (End Game Paths)
  // ------------------------------------------------------------------
  private static checkWinCondition(roomState: RoomState, forceGameOver = false): void {
    const g = roomState.mastermindState;
    if (!g) return;

    const living = Object.values(g.players).filter((p) => p.health !== 'dead');
    const livingSyndicate = living.filter((p) => p.team === 'syndicate');
    const livingTown = living.filter((p) => p.team === 'town');

    // 1. Killer Core Detonation or Town Extinction
    if (g.detonationArmed || livingTown.length === 0) {
      g.winner = 'syndicate';
      g.winnerReason = 'The Syndicate detonated the core and eliminated Town resistance.';
      g.phase = 'game_over';
      roomState.status = 'game_over';
      g.timer = 15;
      return;
    }

    // 2. Doctor Panacea Cure or All Syndicate Eliminated
    if (g.panaceaProgress >= 100 || livingSyndicate.length === 0) {
      g.winner = 'town';
      g.winnerReason = 'The Town synthesized the Panacea and secured shelter quarantine.';
      g.phase = 'game_over';
      roomState.status = 'game_over';
      g.timer = 15;
      return;
    }

    if (forceGameOver) {
      g.winner = livingTown.length >= livingSyndicate.length ? 'town' : 'syndicate';
      g.winnerReason = 'Final round protocol concluded. Majority control established.';
      g.phase = 'game_over';
      roomState.status = 'game_over';
      g.timer = 15;
    }
  }
}
