"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  RoomState,
  MastermindGameState,
  MastermindRole,
  MastermindItem,
} from "../../../../party/types";
import {
  Clock,
  Shield,
  Heart,
  Skull,
  Crosshair,
  Zap,
  ShoppingBag,
  Newspaper,
  Vote,
  Trophy,
  FastForward,
  HelpCircle,
  Eye,
  Lock,
  Unlock,
  Sparkles,
  Bot,
  Play,
  RotateCcw,
  Layers,
  Activity,
  Radio,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Terminal,
} from "lucide-react";
import { WhiteHouseMap3D, PlayerToken } from "./WhiteHouseMap3D";
import { WHITE_HOUSE_SECTORS, RoomSector, CRAFTING_RECIPES, CraftingRecipe } from "./whiteHouseData";
import { VerticalWheelCipher, AverageBiddingTerminal } from "./MiniGames";

interface MastermindGameProps {
  roomState: RoomState;
  myId: string;
  onSubmitMinigameScore: (score: number) => void;
  onBuyItem: (item: MastermindItem) => void;
  onUseAbility: (abilityType: string, targetId?: string) => void;
  onVoteSuspect: (suspectId: string) => void;
  onReturnToLobby: () => void;
  onSkipTimer?: () => void;
}

// ----------------------------------------------------------------------------
// Tactical Role Configuration
// ----------------------------------------------------------------------------
interface RoleSpec {
  role: MastermindRole;
  name: string;
  title: string;
  team: 'syndicate' | 'town' | 'neutral';
  color: string;
  badgeBg: string;
  activeName: string;
  activeDesc: string;
  passiveName: string;
  passiveDesc: string;
}

const ROLES_SPEC: Record<string, RoleSpec> = {
  sheriff: {
    role: "sheriff",
    name: "The Sheriff",
    title: "Enforcer / Lead Investigator",
    team: "town",
    color: "#38bdf8",
    badgeBg: "bg-sky-500/20 text-sky-300 border-sky-500/40",
    activeName: "Interrogate / Detain",
    activeDesc: "Scan adjacent target room history or immobilize suspect for questioning.",
    passiveName: "Ballistic Intel",
    passiveDesc: "Gains directional radar markers toward gunfire & forced terminal access.",
  },
  killer: {
    role: "killer",
    name: "The Killer",
    title: "Agitator / Covert Eliminator",
    team: "syndicate",
    color: "#f43f5e",
    badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    activeName: "Covert Execute",
    activeDesc: "High-damage strike operating on priority queue; leaves traceable forensics.",
    passiveName: "Shadow Step",
    passiveDesc: "Increased sector stealth and zero footstep noise in unlit fog sectors.",
  },
  doctor: {
    role: "doctor",
    name: "The Doctor",
    title: "Support / Field Surgeon",
    team: "town",
    color: "#10b981",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    activeName: "Triage / Defibrillate",
    activeDesc: "Deploy protective nanite shield, cure debuffs, or revive a downed ally.",
    passiveName: "Vital Scan",
    passiveDesc: "Monitors real-time health states & wounds of all players in line of sight.",
  },
  soldier: {
    role: "soldier",
    name: "The Soldier",
    title: "Tactician / Combat Specialist",
    team: "town",
    color: "#3b82f6",
    badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    activeName: "Fortify / Barricade",
    activeDesc: "Deploy defensive door welds, set motion sensors, or suppress hostiles.",
    passiveName: "Reinforced Armor",
    passiveDesc: "Permanent 50% damage reduction on first bullet hit; immune to stagger.",
  },
  thief: {
    role: "thief",
    name: "The Thief",
    title: "Saboteur / Resource Manipulator",
    team: "syndicate",
    color: "#a855f7",
    badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    activeName: "Pickpocket / Terminal Hack",
    activeDesc: "Silently siphon raw scrap components or security keycards from targets.",
    passiveName: "Master Craftsman",
    passiveDesc: "Instant crafting queue and reduced scrap recipe costs at terminals.",
  },
};

// ----------------------------------------------------------------------------
// Local Simulation Player State
// ----------------------------------------------------------------------------
interface SimPlayer {
  id: string;
  name: string;
  role: string;
  team: 'syndicate' | 'town' | 'neutral';
  sectorId: string;
  health: 'healthy' | 'wounded' | 'dead';
  shield: boolean;
  scrap: { circuitry: number; alloy: number; chemical: number; energy: number };
  craftedItems: string[];
  isBot: boolean;
  color: string;
}

export const MastermindGame: React.FC<MastermindGameProps> = ({
  roomState,
  myId,
  onSubmitMinigameScore,
  onBuyItem,
  onUseAbility,
  onVoteSuspect,
  onReturnToLobby,
  onSkipTimer,
}) => {
  // Solo Simulation / Test Lab toggle
  const [selectedPerspectiveId, setSelectedPerspectiveId] = useState<string>("agent_you");

  // Game Phases: 'exploration' | 'resolution' | 'council'
  const [gamePhase, setGamePhase] = useState<'exploration' | 'resolution' | 'council'>('exploration');
  const [roundTimer, setRoundTimer] = useState<number>(45);
  const [protocolRound, setProtocolRound] = useState<number>(1);

  // Sector selection on 3D map
  const [selectedSectorId, setSelectedSectorId] = useState<string>("oval_office");
  const [lockedDoors, setLockedDoors] = useState<string[]>([]);
  const [noiseEvents, setNoiseEvents] = useState<{ sectorId: string; timestamp: number }[]>([]);

  // Active Mini-Game Modal
  const [activeMiniGame, setActiveMiniGame] = useState<'cipher' | 'bidding' | null>(null);

  // Evidence Log / Morning Gazette
  const [evidenceLog, setEvidenceLog] = useState<string[]>([
    "SEC-LOG 00:01 - Presidential Security Grid initialized across White House sectors.",
    "SEC-LOG 00:02 - Five operatives dispersed into Oval Office, Situation Room, and Wings.",
  ]);

  // Simulation Players (1 human player + 4 autonomous bots)
  const [simPlayers, setSimPlayers] = useState<SimPlayer[]>([
    {
      id: "agent_you",
      name: "Operative Prime (You)",
      role: "sheriff",
      team: "town",
      sectorId: "oval_office",
      health: "healthy",
      shield: false,
      scrap: { circuitry: 1, alloy: 1, chemical: 0, energy: 1 },
      craftedItems: [],
      isBot: false,
      color: "#06b6d4",
    },
    {
      id: "agent_beta",
      name: "Agent Beta",
      role: "killer",
      team: "syndicate",
      sectorId: "situation_room",
      health: "healthy",
      shield: false,
      scrap: { circuitry: 0, alloy: 1, chemical: 1, energy: 0 },
      craftedItems: [],
      isBot: true,
      color: "#f43f5e",
    },
    {
      id: "agent_gamma",
      name: "Agent Gamma",
      role: "doctor",
      team: "town",
      sectorId: "cabinet_room",
      health: "healthy",
      shield: true,
      scrap: { circuitry: 1, alloy: 0, chemical: 1, energy: 1 },
      craftedItems: [],
      isBot: true,
      color: "#10b981",
    },
    {
      id: "agent_delta",
      name: "Agent Delta",
      role: "soldier",
      team: "town",
      sectorId: "west_colonnade",
      health: "healthy",
      shield: true,
      scrap: { circuitry: 0, alloy: 2, chemical: 0, energy: 0 },
      craftedItems: [],
      isBot: true,
      color: "#3b82f6",
    },
    {
      id: "agent_epsilon",
      name: "Agent Epsilon",
      role: "thief",
      team: "syndicate",
      sectorId: "basement_tunnels",
      health: "healthy",
      shield: false,
      scrap: { circuitry: 2, alloy: 0, chemical: 1, energy: 1 },
      craftedItems: [],
      isBot: true,
      color: "#a855f7",
    },
  ]);

  // Current active player based on perspective selection
  const activeMe = useMemo(() => {
    return simPlayers.find((p) => p.id === selectedPerspectiveId) || simPlayers[0];
  }, [simPlayers, selectedPerspectiveId]);

  const activeRoleSpec = ROLES_SPEC[activeMe.role] || ROLES_SPEC.sheriff;

  // Selected Sector Details
  const activeSector = useMemo(() => {
    return WHITE_HOUSE_SECTORS.find((s) => s.id === selectedSectorId) || WHITE_HOUSE_SECTORS[0];
  }, [selectedSectorId]);

  // Player Tokens on 3D Map
  const mapPlayerTokens: PlayerToken[] = useMemo(() => {
    return simPlayers.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      sectorId: p.sectorId,
      color: p.color,
      isMe: p.id === activeMe.id,
      health: p.health,
      hasShield: p.shield,
    }));
  }, [simPlayers, activeMe.id]);

  // Line of Sight: current room + adjacent connected rooms + camera rooms
  const myLoSSectors = useMemo(() => {
    const currentSector = WHITE_HOUSE_SECTORS.find((s) => s.id === activeMe.sectorId);
    if (!currentSector) return [activeMe.sectorId];
    return [activeMe.sectorId, ...currentSector.connectedRoomIds];
  }, [activeMe.sectorId]);

  // Autonomous Bot Logic for Simulation
  const simulateBotMoves = () => {
    setSimPlayers((prev) =>
      prev.map((p) => {
        if (!p.isBot || p.health === "dead") return p;
        const currentSec = WHITE_HOUSE_SECTORS.find((s) => s.id === p.sectorId);
        if (!currentSec || currentSec.connectedRoomIds.length === 0) return p;

        // Choose random connected room
        const nextRoomId =
          currentSec.connectedRoomIds[Math.floor(Math.random() * currentSec.connectedRoomIds.length)];

        // Forage random scrap
        const targetSec = WHITE_HOUSE_SECTORS.find((s) => s.id === nextRoomId);
        const scrapTypes = targetSec?.scrapSpawn || ["alloy"];
        const found = scrapTypes[Math.floor(Math.random() * scrapTypes.length)];

        return {
          ...p,
          sectorId: nextRoomId,
          scrap: {
            ...p.scrap,
            [found]: p.scrap[found] + 1,
          },
        };
      })
    );
  };

  // Automated Phase Advancement
  const advancePhase = useCallback(() => {
    if (gamePhase === "exploration") {
      setGamePhase("resolution");
      setEvidenceLog((prev) => [
        `TICK RESOLUTION: Sector action queues locked. Priority resolving: Doctor -> Thief -> Killer -> Sheriff.`,
        ...prev.slice(0, 15),
      ]);
      setRoundTimer(20);
    } else if (gamePhase === "resolution") {
      setGamePhase("council");
      setEvidenceLog((prev) => [
        `COUNCIL IN SESSION: Operatives convene in the Situation Room for evidence sharing & voting tribunal.`,
        ...prev.slice(0, 15),
      ]);
      setRoundTimer(35);
    } else {
      setGamePhase("exploration");
      setProtocolRound((r) => r + 1);
      setRoundTimer(45);
      simulateBotMoves();
    }
  }, [gamePhase]);

  // Phase Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setRoundTimer((t) => {
        if (t <= 1) {
          advancePhase();
          return 45;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gamePhase, advancePhase]);

  // 2D Tactical Command: Dispatch Player to Sector
  const handleDispatchToSector = (targetSectorId: string) => {
    const currentSec = WHITE_HOUSE_SECTORS.find((s) => s.id === activeMe.sectorId);
    if (!currentSec) return;

    const isConnected = currentSec.connectedRoomIds.includes(targetSectorId);
    if (!isConnected && targetSectorId !== activeMe.sectorId) {
      alert(`Sector unreachable directly! You must traverse adjacent connecting hallways.`);
      return;
    }

    setSimPlayers((prev) =>
      prev.map((p) => (p.id === activeMe.id ? { ...p, sectorId: targetSectorId } : p))
    );

    // Forage scrap in new sector
    const targetSec = WHITE_HOUSE_SECTORS.find((s) => s.id === targetSectorId);
    if (targetSec && targetSec.scrapSpawn.length > 0) {
      const found = targetSec.scrapSpawn[Math.floor(Math.random() * targetSec.scrapSpawn.length)];
      setSimPlayers((prev) =>
        prev.map((p) =>
          p.id === activeMe.id
            ? { ...p, scrap: { ...p.scrap, [found]: p.scrap[found] + 1 } }
            : p
        )
      );
      setEvidenceLog((prev) => [
        `FORAGE HARVEST: ${activeMe.name} scavenged 1x [${found.toUpperCase()}] in ${targetSec.name}.`,
        ...prev.slice(0, 15),
      ]);
    }
  };

  // 1-Click Crafting
  const handleCraftItem = (recipe: CraftingRecipe) => {
    for (const [scrapType, amt] of Object.entries(recipe.cost)) {
      if (activeMe.scrap[scrapType as keyof typeof activeMe.scrap] < (amt || 0)) {
        alert(`Insufficient ${scrapType} resources! Scavenge sectors to gather components.`);
        return;
      }
    }

    setSimPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== activeMe.id) return p;
        const newScrap = { ...p.scrap };
        for (const [scrapType, amt] of Object.entries(recipe.cost)) {
          newScrap[scrapType as keyof typeof newScrap] -= amt || 0;
        }
        return {
          ...p,
          scrap: newScrap,
          craftedItems: [...p.craftedItems, recipe.name],
        };
      })
    );

    setEvidenceLog((prev) => [
      `CRAFT SUCCESS: ${activeMe.name} synthesized [${recipe.name}] at workstation terminal.`,
      ...prev.slice(0, 15),
    ]);
  };

  // Role Action Trigger
  const handleDeployRoleAction = (actionName: string) => {
    if (actionName === "Interrogate / Detain") {
      const occupants = simPlayers.filter(
        (p) => p.sectorId === activeMe.sectorId && p.id !== activeMe.id
      );
      if (occupants.length === 0) {
        alert("No suspects in this sector to interrogate. Move to a room with other operatives!");
        return;
      }
      const interrogated = occupants[0];
      setEvidenceLog((prev) => [
        `BALLISTIC INTERROGATION: ${activeMe.name} questioned ${interrogated.name}. Target was verified in ${interrogated.sectorId}.`,
        ...prev.slice(0, 15),
      ]);
    } else if (actionName === "Covert Execute") {
      const targets = simPlayers.filter(
        (p) => p.sectorId === activeMe.sectorId && p.id !== activeMe.id && p.health !== "dead"
      );
      if (targets.length === 0) {
        alert("No targets in this sector to eliminate!");
        return;
      }
      const victim = targets[0];
      setSimPlayers((prev) =>
        prev.map((p) => (p.id === victim.id ? { ...p, health: "dead" } : p))
      );
      setNoiseEvents((prev) => [{ sectorId: activeMe.sectorId, timestamp: Date.now() }, ...prev]);
      setEvidenceLog((prev) => [
        `LETHAL EVENT: Gunfire discharge detected in ${activeSector.name}! ${victim.name} is down!`,
        ...prev.slice(0, 15),
      ]);
    } else if (actionName === "Triage / Defibrillate") {
      const downed = simPlayers.filter((p) => p.sectorId === activeMe.sectorId && p.health === "dead");
      if (downed.length > 0) {
        setSimPlayers((prev) =>
          prev.map((p) => (p.id === downed[0].id ? { ...p, health: "healthy" } : p))
        );
        setEvidenceLog((prev) => [
          `DEFIBRILLATION REVIVAL: Doctor revived ${downed[0].name} back to operational duty!`,
          ...prev.slice(0, 15),
        ]);
      } else {
        setSimPlayers((prev) =>
          prev.map((p) => (p.id === activeMe.id ? { ...p, shield: true } : p))
        );
        setEvidenceLog((prev) => [
          `NANITE SHIELD: Doctor applied kinetic nanite shield to self.`,
          ...prev.slice(0, 15),
        ]);
      }
    } else if (actionName === "Fortify / Barricade") {
      setLockedDoors((prev) =>
        prev.includes(activeMe.sectorId)
          ? prev.filter((id) => id !== activeMe.sectorId)
          : [...prev, activeMe.sectorId]
      );
      setEvidenceLog((prev) => [
        `BLAST DOOR SEAL: Soldier welded barricade on ${activeSector.name} security doors.`,
        ...prev.slice(0, 15),
      ]);
    } else if (actionName === "Pickpocket / Terminal Hack") {
      const victims = simPlayers.filter(
        (p) => p.sectorId === activeMe.sectorId && p.id !== activeMe.id
      );
      if (victims.length === 0) {
        alert("No adjacent operatives to pickpocket in this sector!");
        return;
      }
      const target = victims[0];
      setSimPlayers((prev) =>
        prev.map((p) => {
          if (p.id === target.id) {
            return { ...p, scrap: { ...p.scrap, circuitry: Math.max(0, p.scrap.circuitry - 1) } };
          }
          if (p.id === activeMe.id) {
            return { ...p, scrap: { ...p.scrap, circuitry: p.scrap.circuitry + 1 } };
          }
          return p;
        })
      );
      setEvidenceLog((prev) => [
        `COVERT THEFT: Thief siphoned 1x Circuitry from ${target.name}'s hotbar silently!`,
        ...prev.slice(0, 15),
      ]);
    }
  };

  // Tribunal Vote Ejection
  const handleVoteEject = (targetId: string) => {
    setSimPlayers((prev) =>
      prev.map((p) => (p.id === targetId ? { ...p, health: "dead" } : p))
    );
    const target = simPlayers.find((p) => p.id === targetId);
    setEvidenceLog((prev) => [
      `TRIBUNAL EJECTION: Majority council vote convicted ${target?.name} (${target?.role?.toUpperCase()}). Operative detained.`,
      ...prev.slice(0, 15),
    ]);
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-[#030712] text-slate-100 font-sans select-none overflow-hidden">
      {/* ==================================================================== */}
      {/* Top Cyberpunk Glassmorphic HUD Bar */}
      {/* ==================================================================== */}
      <header className="h-14 bg-slate-950/80 backdrop-blur-md border-b border-cyan-500/30 px-3 md:px-5 flex items-center justify-between z-30 flex-shrink-0 shadow-lg shadow-cyan-950/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h1 className="font-mono font-black text-white text-xs md:text-sm uppercase tracking-wider">
              Mastermind <span className="text-cyan-400">Protocol</span>
            </h1>
            <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              White House Sector Grid
            </span>
          </div>

          {/* Phase Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold uppercase text-slate-200">
              {gamePhase === "exploration" && "Phase 1: Intel & Exploration"}
              {gamePhase === "resolution" && "Phase 2: Tactical Resolution"}
              {gamePhase === "council" && "Phase 3: Council Tribunal"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Phase Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-amber-400 font-mono text-sm font-black">
            <Clock className="w-3.5 h-3.5" />
            <span>{roundTimer}s</span>
          </div>

          {/* Solo Simulation Mode Badge / Perspective Switcher */}
          <div className="flex items-center gap-1.5 bg-purple-950/40 border border-purple-500/40 px-2.5 py-1 rounded-xl text-xs">
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] font-bold text-purple-300 hidden md:inline">Test Lab:</span>
            <select
              value={selectedPerspectiveId}
              onChange={(e) => setSelectedPerspectiveId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              title="Switch role perspective to test any agent"
            >
              {simPlayers.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.name} ({p.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={advancePhase}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all"
            title="Fast forward to next phase"
          >
            <FastForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* Main Body: 3D Architectural Map (Center) + 2D Tactical Controls */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-2.5 gap-2.5 relative">
        {/* Left Column: 2D Tactical Operative Dossier & Crafting Matrix */}
        <div className="w-full lg:w-80 flex flex-col gap-2.5 flex-shrink-0 z-20 overflow-y-auto max-h-full">
          {/* Active Operative Role Card */}
          <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-3.5 shadow-xl flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                Active Operative File
              </span>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${activeRoleSpec.badgeBg}`}>
                {activeRoleSpec.team}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg border"
                style={{ backgroundColor: `${activeRoleSpec.color}20`, borderColor: activeRoleSpec.color, color: activeRoleSpec.color }}
              >
                {activeMe.role === "sheriff" && "🤠"}
                {activeMe.role === "killer" && "🔪"}
                {activeMe.role === "doctor" && "💉"}
                {activeMe.role === "soldier" && "🛡️"}
                {activeMe.role === "thief" && "🦹"}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-black text-white truncate">{activeMe.name}</h2>
                <div className="text-[11px] font-mono font-bold text-cyan-400">{activeRoleSpec.title}</div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span className="text-slate-300">Sector:</span>
                  <span className="text-white font-semibold truncate">{activeSector.name}</span>
                </div>
              </div>
            </div>

            {/* Active & Passive Capability */}
            <div className="flex flex-col gap-1.5 p-2 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px]">
              <div>
                <span className="font-bold text-cyan-300 block">⚡ {activeRoleSpec.activeName}</span>
                <span className="text-[10px] text-slate-400 leading-tight">{activeRoleSpec.activeDesc}</span>
              </div>
              <div className="border-t border-slate-800 pt-1.5 mt-0.5">
                <span className="font-bold text-amber-300 block">👁️ {activeRoleSpec.passiveName}</span>
                <span className="text-[10px] text-slate-400 leading-tight">{activeRoleSpec.passiveDesc}</span>
              </div>
            </div>

            {/* Active Action Deployment Button */}
            <button
              type="button"
              onClick={() => handleDeployRoleAction(activeRoleSpec.activeName)}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs shadow-md shadow-cyan-600/30 transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Deploy {activeRoleSpec.activeName}</span>
            </button>
          </div>

          {/* Scavenged Scrap Hot-Bar */}
          <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-lg">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
              Raw Scrap Inventory ({activeMe.name})
            </span>
            <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
              <div className="p-1.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 block">Circuit</span>
                <span className="text-xs font-bold text-cyan-400">💾 {activeMe.scrap.circuitry}</span>
              </div>
              <div className="p-1.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 block">Alloy</span>
                <span className="text-xs font-bold text-blue-400">🛡️ {activeMe.scrap.alloy}</span>
              </div>
              <div className="p-1.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 block">Solvent</span>
                <span className="text-xs font-bold text-emerald-400">🧪 {activeMe.scrap.chemical}</span>
              </div>
              <div className="p-1.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 block">Energy</span>
                <span className="text-xs font-bold text-amber-400">⚡ {activeMe.scrap.energy}</span>
              </div>
            </div>
          </div>

          {/* 1-Click Crafting Matrix */}
          <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl p-3 flex-1 flex flex-col gap-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
              Terminal Crafting Queue
            </span>
            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-48">
              {CRAFTING_RECIPES.map((recipe) => (
                <div
                  key={recipe.id}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 hover:border-slate-700 transition-all text-xs"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base">{recipe.icon}</span>
                    <div className="truncate">
                      <div className="font-bold text-white text-[11px] truncate">{recipe.name}</div>
                      <div className="text-[9px] text-slate-400 truncate">{recipe.effect}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCraftItem(recipe)}
                    className="px-2 py-1 bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 hover:text-white border border-cyan-500/40 rounded-lg text-[10px] font-bold font-mono transition-all flex-shrink-0"
                  >
                    Craft
                  </button>
                </div>
              ))}
            </div>

            {/* Embedded Mini-Game Launch Triggers */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveMiniGame("cipher")}
                className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1 transition-all"
              >
                <Terminal className="w-3 h-3" />
                <span>Letter Cipher</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMiniGame("bidding")}
                className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-purple-500/30 text-purple-300 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1 transition-all"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span>0.8x Bid Terminal</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center: 3D Architectural White House Map */}
        <div className="flex-1 flex flex-col rounded-2xl overflow-hidden relative border border-slate-800/80 shadow-2xl">
          <WhiteHouseMap3D
            selectedSectorId={selectedSectorId}
            onSelectSector={(secId) => setSelectedSectorId(secId)}
            playerTokens={mapPlayerTokens}
            myLoSSectors={myLoSSectors}
            noisePings={noiseEvents}
            lockedDoors={lockedDoors}
          />

          {/* Floating Sector Command Overlay */}
          <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md p-3 rounded-2xl border border-cyan-500/40 max-w-xs shadow-2xl z-20">
            <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block mb-0.5">
              Sector Inspection:
            </span>
            <h3 className="text-sm font-black text-white">{activeSector.name}</h3>
            <p className="text-[10px] text-slate-300 leading-relaxed my-1">{activeSector.description}</p>
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mb-2">
              <span>Security: Level {activeSector.securityLevel}</span>
              {activeSector.hasCamera && <span className="text-emerald-400">📹 Camera Online</span>}
              {activeSector.hasTerminal && <span className="text-cyan-400">💻 Terminal Hub</span>}
            </div>

            {/* Dispatch Action */}
            <button
              type="button"
              onClick={() => handleDispatchToSector(activeSector.id)}
              className="w-full py-1.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-[11px] shadow transition-all active:scale-95"
            >
              Dispatch Operative Here
            </button>
          </div>

          {/* Mini-Game Overlays */}
          {activeMiniGame === "cipher" && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-40 animate-fade-in">
              <div className="relative w-full max-w-md">
                <VerticalWheelCipher
                  targetWord="OVAL"
                  onSuccess={() => {
                    alert("Cylinder Decrypted! Emergency keycard extracted & 1x Energy Cell harvested.");
                    setActiveMiniGame(null);
                  }}
                  onFail={() => setActiveMiniGame(null)}
                />
                <button
                  type="button"
                  onClick={() => setActiveMiniGame(null)}
                  className="mt-2 w-full py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Abort Decryption
                </button>
              </div>
            </div>
          )}

          {activeMiniGame === "bidding" && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-40 animate-fade-in">
              <div className="relative w-full max-w-md">
                <AverageBiddingTerminal
                  onComplete={(res) => {
                    alert(
                      res.isWinner
                        ? "Victory! You conquered the 80% Average Bidding algorithm and secured the High-Tier cache!"
                        : `Algorithm complete. Target: ${res.target}. ${res.penaltyUser} had farthest bid!`
                    );
                    setActiveMiniGame(null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setActiveMiniGame(null)}
                  className="mt-2 w-full py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Exit Terminal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Intel Feed & Council Voting Tribunal */}
        <div className="w-full lg:w-72 flex flex-col gap-2.5 flex-shrink-0 z-20 overflow-y-auto max-h-full">
          {/* Real-time Intel & Forensic Feed */}
          <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl p-3 flex-1 flex flex-col shadow-lg">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Classified Intel Log</span>
            </span>
            <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto max-h-56 p-1.5 bg-slate-900/60 rounded-xl border border-slate-800/80 font-mono text-[10px] text-slate-300">
              {evidenceLog.map((log, i) => (
                <div key={i} className="leading-snug border-b border-slate-800/50 pb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Council Tribunal / Voting Matrix */}
          <div className="bg-slate-950/85 backdrop-blur-md border border-rose-500/30 rounded-2xl p-3 shadow-lg flex flex-col gap-2">
            <span className="text-[10px] font-mono font-bold text-rose-300 uppercase tracking-widest block flex items-center gap-1.5">
              <Vote className="w-3.5 h-3.5 text-rose-400" />
              <span>Tribunal Council Ejection</span>
            </span>

            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {simPlayers
                .filter((p) => p.id !== activeMe.id)
                .map((target) => (
                  <div
                    key={target.id}
                    className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="truncate">
                      <span className="font-bold text-white block truncate text-[11px]">{target.name}</span>
                      <span className="text-[9px] text-slate-500 font-mono">{target.sectorId}</span>
                    </div>
                    {target.health === "dead" ? (
                      <span className="text-[10px] text-rose-500 font-mono font-bold">KIA</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleVoteEject(target.id)}
                        className="px-2 py-0.5 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 text-[10px] font-bold font-mono transition-all"
                      >
                        Accuse
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
