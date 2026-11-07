// White House Architectural Spatial Grid & Tactical Sectors
export interface RoomSector {
  id: string;
  name: string;
  wing: 'west_wing' | 'east_wing' | 'residence' | 'sub_basement';
  x: number; // 3D world X (meters)
  z: number; // 3D world Z (meters)
  width: number;
  depth: number;
  color: string;
  hasTerminal: boolean;
  hasCamera: boolean;
  hasVent: boolean;
  securityLevel: 1 | 2 | 3; // 3 = Situation Room & Oval
  description: string;
  scrapSpawn: ('circuitry' | 'alloy' | 'chemical' | 'energy')[];
  connectedRoomIds: string[];
}

export const WHITE_HOUSE_SECTORS: RoomSector[] = [
  {
    id: 'oval_office',
    name: 'Oval Office',
    wing: 'west_wing',
    x: -16,
    z: -8,
    width: 10,
    depth: 12,
    color: '#06b6d4', // Cyan
    hasTerminal: true,
    hasCamera: true,
    hasVent: false,
    securityLevel: 3,
    description: 'Executive command suite. Classified presidential terminal hub.',
    scrapSpawn: ['circuitry', 'energy'],
    connectedRoomIds: ['west_colonnade', 'roosevelt_room', 'cabinet_room'],
  },
  {
    id: 'cabinet_room',
    name: 'Cabinet Room',
    wing: 'west_wing',
    x: -16,
    z: 6,
    width: 9,
    depth: 10,
    color: '#3b82f6', // Blue
    hasTerminal: true,
    hasCamera: true,
    hasVent: true,
    securityLevel: 2,
    description: 'High-level meeting room with direct Oval Office access.',
    scrapSpawn: ['alloy', 'circuitry'],
    connectedRoomIds: ['oval_office', 'roosevelt_room', 'west_colonnade'],
  },
  {
    id: 'roosevelt_room',
    name: 'Roosevelt Room',
    wing: 'west_wing',
    x: -6,
    z: 0,
    width: 8,
    depth: 9,
    color: '#6366f1', // Indigo
    hasTerminal: false,
    hasCamera: true,
    hasVent: true,
    securityLevel: 2,
    description: 'Central strategy room linking the West Wing offices.',
    scrapSpawn: ['chemical', 'alloy'],
    connectedRoomIds: ['oval_office', 'cabinet_room', 'west_colonnade', 'press_briefing'],
  },
  {
    id: 'press_briefing',
    name: 'Press Briefing Room',
    wing: 'west_wing',
    x: -6,
    z: 11,
    width: 8,
    depth: 8,
    color: '#8b5cf6', // Violet
    hasTerminal: true,
    hasCamera: true,
    hasVent: false,
    securityLevel: 1,
    description: 'Public media podium. Easy ingress/egress to colonnade.',
    scrapSpawn: ['circuitry', 'chemical'],
    connectedRoomIds: ['roosevelt_room', 'west_colonnade'],
  },
  {
    id: 'west_colonnade',
    name: 'West Colonnade',
    wing: 'west_wing',
    x: -5,
    z: -8,
    width: 12,
    depth: 4,
    color: '#0ea5e9', // Sky
    hasTerminal: false,
    hasCamera: true,
    hasVent: false,
    securityLevel: 1,
    description: 'Glass-lined walkway connecting West Wing to Central Residence.',
    scrapSpawn: ['alloy'],
    connectedRoomIds: ['oval_office', 'cabinet_room', 'roosevelt_room', 'cross_hall', 'situation_room'],
  },
  {
    id: 'cross_hall',
    name: 'Cross Hall & Grand Foyer',
    wing: 'residence',
    x: 6,
    z: -3,
    width: 14,
    depth: 7,
    color: '#eab308', // Amber
    hasTerminal: false,
    hasCamera: true,
    hasVent: false,
    securityLevel: 1,
    description: 'Grand marble corridor on State Floor with wide visibility cones.',
    scrapSpawn: ['alloy', 'chemical'],
    connectedRoomIds: ['west_colonnade', 'east_room', 'blue_room', 'basement_stairs'],
  },
  {
    id: 'blue_room',
    name: 'Blue & Red State Parlors',
    wing: 'residence',
    x: 6,
    z: 6,
    width: 11,
    depth: 8,
    color: '#10b981', // Emerald
    hasTerminal: false,
    hasCamera: false,
    hasVent: true,
    securityLevel: 1,
    description: 'Diplomatic reception rooms with multiple concealment nooks.',
    scrapSpawn: ['chemical', 'energy'],
    connectedRoomIds: ['cross_hall', 'east_room'],
  },
  {
    id: 'east_room',
    name: 'East Room Colonnade',
    wing: 'east_wing',
    x: 18,
    z: 0,
    width: 10,
    depth: 16,
    color: '#ec4899', // Pink
    hasTerminal: true,
    hasCamera: true,
    hasVent: true,
    securityLevel: 2,
    description: 'Largest ceremonial hall in the complex. Houses surveillance switchboards.',
    scrapSpawn: ['energy', 'alloy'],
    connectedRoomIds: ['cross_hall', 'blue_room', 'east_wing_lobby'],
  },
  {
    id: 'east_wing_lobby',
    name: 'East Wing Entrance',
    wing: 'east_wing',
    x: 27,
    z: -5,
    width: 8,
    depth: 10,
    color: '#f43f5e', // Rose
    hasTerminal: false,
    hasCamera: true,
    hasVent: false,
    securityLevel: 1,
    description: 'Perimeter guest security and screening checkpoint.',
    scrapSpawn: ['alloy', 'chemical'],
    connectedRoomIds: ['east_room', 'basement_stairs'],
  },
  {
    id: 'situation_room',
    name: 'Situation Room (Secure Intel)',
    wing: 'sub_basement',
    x: -14,
    z: -20,
    width: 11,
    depth: 9,
    color: '#ef4444', // Red Warning
    hasTerminal: true,
    hasCamera: true,
    hasVent: false,
    securityLevel: 3,
    description: 'Subterranean 24/7 intelligence center with hardened encryption terminal.',
    scrapSpawn: ['circuitry', 'energy'],
    connectedRoomIds: ['west_colonnade', 'basement_tunnels'],
  },
  {
    id: 'basement_stairs',
    name: 'Basement Security Stairwell',
    wing: 'sub_basement',
    x: 12,
    z: -14,
    width: 6,
    depth: 6,
    color: '#64748b', // Slate
    hasTerminal: false,
    hasCamera: false,
    hasVent: true,
    securityLevel: 2,
    description: 'Concrete stairwell plunging into the subterranean utility grid.',
    scrapSpawn: ['alloy', 'energy'],
    connectedRoomIds: ['cross_hall', 'east_wing_lobby', 'basement_tunnels'],
  },
  {
    id: 'basement_tunnels',
    name: 'Sub-Basement Utility Tunnels',
    wing: 'sub_basement',
    x: -2,
    z: -22,
    width: 16,
    depth: 6,
    color: '#f97316', // Orange
    hasTerminal: true,
    hasCamera: false,
    hasVent: true,
    securityLevel: 3,
    description: 'Industrial steam pipes, power breakers, and stealth ventilation hubs.',
    scrapSpawn: ['chemical', 'circuitry', 'energy'],
    connectedRoomIds: ['situation_room', 'basement_stairs'],
  },
];

export interface CraftingRecipe {
  id: string;
  name: string;
  icon: string;
  cost: { [key in 'circuitry' | 'alloy' | 'chemical' | 'energy']?: number };
  description: string;
  effect: string;
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'emp_grenade',
    name: 'EMP Disruption Grenade',
    icon: '⚡',
    cost: { circuitry: 1, energy: 1 },
    description: 'High-yield electromagnetic pulse device.',
    effect: 'Disables cameras and room lighting in targeted sector for 20s.',
  },
  {
    id: 'improvised_kevlar',
    name: 'Improvised Kevlar & Door Weld',
    icon: '🛡️',
    cost: { alloy: 1, chemical: 1 },
    description: 'Ballistic composite plate or high-temperature door barricade.',
    effect: 'Absorbs 1 lethal wound OR seals target room door against passage.',
  },
  {
    id: 'tracker_beacon',
    name: 'Sub-Audible Tracker Beacon',
    icon: '📡',
    cost: { circuitry: 1, alloy: 1 },
    description: 'Micro RF transmitter planted secretly on target.',
    effect: 'Reveals target player movements and sector across fog of war for 45s.',
  },
  {
    id: 'adrenaline_syringe',
    name: 'Combat Adrenaline Syringe',
    icon: '🧪',
    cost: { chemical: 1, energy: 1 },
    description: 'Neuro-stimulant compound.',
    effect: 'Grants instant extra sector traversal and double mini-game score.',
  },
];
