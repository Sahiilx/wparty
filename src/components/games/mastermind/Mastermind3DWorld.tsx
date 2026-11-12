"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import {
  MastermindGameState,
  MastermindPlayerInfo,
  MastermindItem,
} from "../../../../party/types";
import { OAKHAVEN_SECTORS, SectorDef, MASTER_ITEM_CATALOG } from "./oakhavenMapData";
import {
  Crosshair,
  Compass,
  Zap,
  Shield,
  Heart,
  Package,
  Wrench,
  Radio,
  MapPin,
  Lock,
  Sparkles,
  Smile,
  Navigation,
  Maximize2,
  Minimize2,
  HelpCircle,
  X,
  Target,
  ShoppingCart,
  Eye,
  Tv,
} from "lucide-react";

export type CharacterSkin =
  | "chameleon"
  | "monarch"
  | "mecha"
  | "neko"
  | "shadow"
  | "dino"
  | "bunny"
  | "cosmo";

export const SKIN_LIST: Array<{ id: CharacterSkin; name: string; icon: string; desc: string }> = [
  { id: "chameleon", name: "Mecha Chameleon", icon: "🦎", desc: "Curled mechanical tail, sensory head crest & swivel eyes" },
  { id: "monarch", name: "Cyber Monarch", icon: "👑", desc: "Floating holographic golden crown & imperial aura" },
  { id: "mecha", name: "Mecha Bot S-01", icon: "🤖", desc: "Dual shoulder power cells & scanning antennae" },
  { id: "neko", name: "Robo-Neko", icon: "🐱", desc: "Cybernetic cat ears, whisker sensors & robotic kitten tail" },
  { id: "shadow", name: "Shadow Infiltrator", icon: "🥷", desc: "Stealth shinobi cowl & crimson visor slit" },
  { id: "dino", name: "Cyber Dino", icon: "🦖", desc: "Cute baby dino tail & neon glowing dorsal back spikes" },
  { id: "bunny", name: "Cyber Bunny", icon: "🐰", desc: "Tall mechanical rabbit ears with illuminated LED sensor panels" },
  { id: "cosmo", name: "Retro Cosmonaut", icon: "🧑‍🚀", desc: "Golden reflective bubble helmet & twin oxygen thruster pack" },
];

export interface ActiveProjectile3D {
  id: string;
  mesh: THREE.Object3D;
  start: THREE.Vector3;
  target: THREE.Vector3;
  startTime: number;
  duration: number;
  item: "tomato" | "balloon" | "popper" | "duck" | "bomb";
}

export interface ActiveSplash3D {
  group: THREE.Group;
  particles: Array<{ mesh: THREE.Mesh; velocity: THREE.Vector3 }>;
  startTime: number;
  duration: number;
}

interface Mastermind3DWorldProps {
  gameState: MastermindGameState;
  myId: string;
  phase?: string;
  themePrimary?: string;
  selectedTargetId?: string | null;
  isFocusingTableScreen?: boolean;
  onToggleFocusTableScreen?: (focus: boolean) => void;
  onMovePlayer?: (x: number, z: number, rotation: number, isMoving: boolean, skin?: string, sectorId?: string) => void;
  onCollectScrap?: (scrapId: string) => void;
  onSelectSkin?: (skin: string) => void;
  onUseAbility?: (abilityType: string, targetId?: string) => void;
  onInteract?: (type: "table" | "craft" | "terminal" | "scrap" | "arcade" | "tablet", entityId?: string) => void;
  onTriggerEmote?: (emote: string) => void;
  onThrowItem?: (item: "tomato" | "balloon" | "popper" | "duck" | "bomb", targetId?: string) => void;
  onOpenShop?: () => void;
  onOpenCrafting?: () => void;
  onSelectTargetPlayer?: (playerId: string) => void;
  hideDefaultHud?: boolean;
}

export const Mastermind3DWorld: React.FC<Mastermind3DWorldProps> = ({
  gameState,
  myId,
  phase = "shop_and_craft",
  themePrimary = "#00f0ff",
  selectedTargetId,
  isFocusingTableScreen = false,
  onToggleFocusTableScreen,
  onMovePlayer,
  onCollectScrap,
  onSelectSkin,
  onUseAbility,
  onInteract,
  onTriggerEmote,
  onThrowItem,
  onOpenShop,
  onOpenCrafting,
  onSelectTargetPlayer,
  hideDefaultHud = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const myPlayer = gameState.players[myId];

  // Local Player Movement, Physics & Seating State
  const localPosRef = useRef({
    x: 0,
    z: 5.5,
    y: 0.35,
    yVel: 0,
    rotation: 0,
    isMoving: false,
    isSeated: true,
  });

  const joystickDirRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSeated, setIsSeated] = useState(true);
  const [currentSkin, setCurrentSkin] = useState<CharacterSkin>((myPlayer?.skin as CharacterSkin) || "chameleon");
  const [skinDrawerOpen, setSkinDrawerOpen] = useState(false);
  const [currentSectorName, setCurrentSectorName] = useState("Council Chamber (Round Table)");
  const [minimapExpanded, setMinimapExpanded] = useState(false);

  // Free Look Camera Spherical Coordinates
  const camYawRef = useRef(0);
  const camPitchRef = useRef(0.35); // Radians vertical tilt
  const camDistRef = useRef(5.5);   // Distance from player / target

  // Interaction Proximity Prompt
  const [nearbyInteractable, setNearbyInteractable] = useState<{
    type: "table" | "craft" | "terminal" | "scrap" | "arcade" | "tablet";
    label: string;
    id?: string;
  } | null>(null);

  // Emote Wheel state
  const [emoteWheelOpen, setEmoteWheelOpen] = useState(false);
  const [throwWheelOpen, setThrowWheelOpen] = useState(false);
  const [activeEmotes, setActiveEmotes] = useState<Record<string, string>>({});

  // Mobile virtual joystick touch tracking
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickKnob, setJoystickKnob] = useState({ x: 0, y: 0 });
  const joystickBaseRef = useRef<HTMLDivElement>(null);

  // Keyboard keys pressed
  const keysPressedRef = useRef<Record<string, boolean>>({});

  // Trigger 3D Throw from React to Three.js
  const throwQueueRef = useRef<Array<{
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    item: "tomato" | "balloon" | "popper" | "duck" | "bomb";
  }>>([]);

  // Sync Skin to Server
  const handleChooseSkin = (skin: CharacterSkin) => {
    setCurrentSkin(skin);
    setSkinDrawerOpen(false);
    if (onSelectSkin) onSelectSkin(skin);
  };

  // Sync Emote
  const handleSendEmote = (emote: string) => {
    setActiveEmotes((prev) => ({ ...prev, [myId]: emote }));
    setEmoteWheelOpen(false);
    if (onTriggerEmote) onTriggerEmote(emote);
    setTimeout(() => {
      setActiveEmotes((prev) => {
        const next = { ...prev };
        delete next[myId];
        return next;
      });
    }, 2800);
  };

  // Throw 3D Harmless Item
  const handleThrow = (item: "tomato" | "balloon" | "popper" | "duck" | "bomb") => {
    setThrowWheelOpen(false);
    const otherPlayers = Object.entries(gameState.players).filter(([id]) => id !== myId);
    let targetPlayer = otherPlayers[0]?.[1];
    let targetPid = otherPlayers[0]?.[0];

    if (selectedTargetId && gameState.players[selectedTargetId]) {
      targetPlayer = gameState.players[selectedTargetId];
      targetPid = selectedTargetId;
    } else {
      let closestDist = Infinity;
      otherPlayers.forEach(([id, p]) => {
        const d = Math.hypot((p.x ?? 0) - localPosRef.current.x, (p.z ?? 0) - localPosRef.current.z);
        if (d < closestDist) {
          closestDist = d;
          targetPlayer = p;
          targetPid = id;
        }
      });
    }

    const start = new THREE.Vector3(localPosRef.current.x, 1.2, localPosRef.current.z);
    const target = targetPlayer
      ? new THREE.Vector3(targetPlayer.x ?? 0, 1.2, targetPlayer.z ?? 0)
      : new THREE.Vector3(0, 1.2, 0);

    throwQueueRef.current.push({ fromPos: start, toPos: target, item });

    if (onThrowItem) {
      onThrowItem(item, targetPid);
    }
  };

  // Stand Up or Sit Down Action
  const toggleSit = (seatPos?: { x: number; z: number; rotation: number }) => {
    if (localPosRef.current.isSeated) {
      localPosRef.current.isSeated = false;
      setIsSeated(false);
    } else if (seatPos) {
      localPosRef.current.x = seatPos.x;
      localPosRef.current.z = seatPos.z;
      localPosRef.current.rotation = seatPos.rotation;
      localPosRef.current.isSeated = true;
      setIsSeated(true);
    }
  };

  // =========================================================================
  // KEYBOARD CONTROLS (WASD / Arrows / Space / E / B)
  // =========================================================================
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = true;
      if (e.code === "KeyE") {
        if (nearbyInteractable) {
          if (onInteract) onInteract(nearbyInteractable.type, nearbyInteractable.id);
          if (nearbyInteractable.type === "arcade" && onOpenShop) onOpenShop();
          if (nearbyInteractable.type === "tablet" && onOpenCrafting) onOpenCrafting();
        }
      }
      if (e.code === "Space") {
        if (localPosRef.current.isSeated) {
          localPosRef.current.isSeated = false;
          setIsSeated(false);
        } else if (localPosRef.current.y <= 0.36) {
          localPosRef.current.yVel = 6.2;
        }
      }
      if (e.code === "KeyB" && onOpenShop) {
        onOpenShop();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [nearbyInteractable, onInteract, onOpenShop, onOpenCrafting]);

  // =========================================================================
  // VIRTUAL JOYSTICK TOUCH HANDLERS (Mobile Friendly)
  // =========================================================================
  const handleJoystickTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setJoystickActive(true);
    updateJoystickPos(e);
  };

  const handleJoystickTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!joystickActive) return;
    updateJoystickPos(e);
  };

  const handleJoystickTouchEnd = () => {
    setJoystickActive(false);
    setJoystickKnob({ x: 0, y: 0 });
    joystickDirRef.current = { x: 0, y: 0 };
  };

  const updateJoystickPos = (e: React.TouchEvent | React.MouseEvent) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = rect.width / 2 - 10;

    let knobX = dx;
    let knobY = dy;
    if (dist > maxRadius) {
      knobX = (dx / dist) * maxRadius;
      knobY = (dy / dist) * maxRadius;
    }

    setJoystickKnob({ x: knobX, y: knobY });
    joystickDirRef.current = {
      x: knobX / maxRadius,
      y: knobY / maxRadius,
    };
  };

  // =========================================================================
  // THREE.JS 3D SCENE & ENGINE
  // =========================================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.012);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 120);
    camera.position.set(0, 5.6, 8.5);
    camera.lookAt(0, 1.25, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 2. Dynamic Lighting System
    const ambientLight = new THREE.AmbientLight(0x1e293b, 2.8);
    scene.add(ambientLight);

    const mainCenterLight = new THREE.PointLight(0x00f0ff, 4.5, 60);
    mainCenterLight.position.set(0, 6.0, 0);
    mainCenterLight.castShadow = true;
    scene.add(mainCenterLight);

    const northLight = new THREE.PointLight(0x38bdf8, 2.5, 40);
    northLight.position.set(0, 5.0, -10);
    scene.add(northLight);

    const southLight = new THREE.PointLight(0xf59e0b, 2.5, 40);
    southLight.position.set(0, 5.0, 10);
    scene.add(southLight);

    // 3. HIGH-TECH ROUND COUNCIL CHAMBER WALLS & ARCHITECTURE
    const roomRadius = 14.5;
    const roomHeight = 6.8;

    // Circular Floor
    const floorGeo = new THREE.CircleGeometry(roomRadius, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x040812,
      roughness: 0.15,
      metalness: 0.85,
    });
    const foundationMesh = new THREE.Mesh(floorGeo, floorMat);
    foundationMesh.rotation.x = -Math.PI / 2;
    foundationMesh.position.y = 0.1;
    foundationMesh.receiveShadow = true;
    scene.add(foundationMesh);

    // Curved Chamber Perimeter Wall
    const wallGeo = new THREE.CylinderGeometry(roomRadius, roomRadius, roomHeight, 40, 1, true);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x07111e,
      roughness: 0.35,
      metalness: 0.7,
      side: THREE.BackSide,
    });
    const chamberWall = new THREE.Mesh(wallGeo, wallMat);
    chamberWall.position.y = roomHeight / 2;
    scene.add(chamberWall);

    // Glowing Neon Vertical Ribs on Wall
    for (let r = 0; r < 12; r++) {
      const ribAngle = (r / 12) * Math.PI * 2;
      const rx = Math.cos(ribAngle) * (roomRadius - 0.1);
      const rz = Math.sin(ribAngle) * (roomRadius - 0.1);
      const ribGeo = new THREE.BoxGeometry(0.18, roomHeight, 0.25);
      const ribMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const rib = new THREE.Mesh(ribGeo, ribMat);
      rib.position.set(rx, roomHeight / 2, rz);
      rib.rotation.y = -ribAngle + Math.PI / 2;
      scene.add(rib);
    }

    // Ceiling Neon Ring
    const ceilingRingGeo = new THREE.TorusGeometry(roomRadius - 0.2, 0.08, 8, 40);
    const ceilingRingMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const ceilingRing = new THREE.Mesh(ceilingRingGeo, ceilingRingMat);
    ceilingRing.rotation.x = Math.PI / 2;
    ceilingRing.position.y = roomHeight;
    scene.add(ceilingRing);

    // 4. DYNAMIC HIGH-TECH ROUND TABLE (Scales with player count)
    const playerList = Object.entries(gameState.players);
    const pCount = Math.max(3, playerList.length || 4);
    const tableRadius = Math.max(2.9, Math.min(6.2, 1.8 + pCount * 0.45));
    const chairRadius = tableRadius + 1.25;

    // Main Table Top
    const tableGeo = new THREE.CylinderGeometry(tableRadius, tableRadius, 0.35, 48);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x071120,
      roughness: 0.18,
      metalness: 0.85,
    });
    const tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.position.set(0, 1.0, 0);
    scene.add(tableMesh);

    // Glowing cyber neon rim around table edge
    const tableEdgeGeo = new THREE.TorusGeometry(tableRadius, 0.08, 8, 48);
    const tableEdgeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const tableEdge = new THREE.Mesh(tableEdgeGeo, tableEdgeMat);
    tableEdge.rotation.x = Math.PI / 2;
    tableEdge.position.y = 1.18, 0;
    scene.add(tableEdge);

    // Center holographic projector & spinning crystal (Panacea Matrix)
    const crystalGeo = new THREE.OctahedronGeometry(0.55, 0);
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    crystalMesh.position.set(0, 1.9, 0);
    scene.add(crystalMesh);

    // Center projector column
    const projColGeo = new THREE.CylinderGeometry(0.04, 0.32, 2.8, 12, 1, true);
    const projColMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    const projCol = new THREE.Mesh(projColGeo, projColMat);
    projCol.position.set(0, 2.5, 0);
    scene.add(projCol);

    // 5. Chairs, In-Table Embedded Monitors, and Crafting Tablets
    const chairPositions: Array<{ x: number; z: number; rotation: number; seatIndex: number }> = [];
    const clickableTargets: Array<{ object: THREE.Object3D; type: "arcade" | "tablet" | "player"; id?: string }> = [];

    for (let i = 0; i < pCount; i++) {
      const angle = (i * 2 * Math.PI) / pCount;
      const cx = Math.cos(angle) * chairRadius;
      const cz = Math.sin(angle) * chairRadius;
      const rotY = -angle + Math.PI / 2; // Face table center
      chairPositions.push({ x: cx, z: cz, rotation: rotY, seatIndex: i });

      // Ergonomic Cyber Chair
      const chairGroup = new THREE.Group();
      chairGroup.position.set(cx, 0.35, cz);
      chairGroup.rotation.y = rotY;

      const seatGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.12, 16);
      const seatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.2 });
      const seat = new THREE.Mesh(seatGeo, seatMat);
      seat.position.y = 0.5;
      chairGroup.add(seat);

      const backGeo = new THREE.BoxGeometry(0.72, 0.65, 0.1);
      const back = new THREE.Mesh(backGeo, seatMat);
      back.position.set(0, 0.88, -0.38);
      chairGroup.add(back);

      const armLGeo = new THREE.BoxGeometry(0.08, 0.35, 0.5);
      const armL = new THREE.Mesh(armLGeo, seatMat);
      armL.position.set(-0.35, 0.72, -0.05);
      chairGroup.add(armL);
      const armR = new THREE.Mesh(armLGeo, seatMat);
      armR.position.set(0.35, 0.72, -0.05);
      chairGroup.add(armR);

      scene.add(chairGroup);

      // Embedded In-Table Monitor (Inside the table directly in front of the chair)
      const screenDist = tableRadius - 0.72;
      const sx = Math.cos(angle) * screenDist;
      const sz = Math.sin(angle) * screenDist;

      const screenGroup = new THREE.Group();
      screenGroup.position.set(sx, 1.18, sz);
      screenGroup.rotation.y = rotY;

      const bezelGeo = new THREE.BoxGeometry(0.92, 0.04, 0.56);
      const bezelMat = new THREE.MeshStandardMaterial({ color: 0x050c18, roughness: 0.2, metalness: 0.9 });
      const bezel = new THREE.Mesh(bezelGeo, bezelMat);
      screenGroup.add(bezel);

      // In-Table screen surface
      const scrnPlaneGeo = new THREE.PlaneGeometry(0.84, 0.48);
      const scrnPlaneMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });
      const scrnPlane = new THREE.Mesh(scrnPlaneGeo, scrnPlaneMat);
      scrnPlane.rotation.x = -Math.PI / 2;
      scrnPlane.position.y = 0.025;
      screenGroup.add(scrnPlane);

      const bezelEdgeGeo = new THREE.EdgesGeometry(bezelGeo);
      const bezelEdgeMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
      const bezelEdge = new THREE.LineSegments(bezelEdgeGeo, bezelEdgeMat);
      screenGroup.add(bezelEdge);

      scene.add(screenGroup);

      // Crafting Cyber Tablet
      const tabDist = tableRadius - 0.65;
      const tabAngle = angle + 0.24;
      const tx = Math.cos(tabAngle) * tabDist;
      const tz = Math.sin(tabAngle) * tabDist;

      const tabletGroup = new THREE.Group();
      tabletGroup.position.set(tx, 1.185, tz);
      tabletGroup.rotation.y = rotY + 0.15;

      const tabBodyGeo = new THREE.BoxGeometry(0.38, 0.03, 0.28);
      const tabBodyMat = new THREE.MeshStandardMaterial({ color: 0x181028, roughness: 0.3, metalness: 0.7 });
      const tabBody = new THREE.Mesh(tabBodyGeo, tabBodyMat);
      tabletGroup.add(tabBody);

      const tabDisplayGeo = new THREE.PlaneGeometry(0.34, 0.24);
      const tabDisplayMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide });
      const tabDisplay = new THREE.Mesh(tabDisplayGeo, tabDisplayMat);
      tabDisplay.rotation.x = -Math.PI / 2;
      tabDisplay.position.y = 0.02;
      tabletGroup.add(tabDisplay);

      clickableTargets.push({ object: tabBody, type: "tablet" });
      scene.add(tabletGroup);
    }

    // 6. ARCADE MACHINE IN THE SAME ROOM ("ARCADE BLACK MARKET")
    const arcadePos = { x: tableRadius + 3.8, y: 0, z: -1.8 };
    const arcadeMachineGroup = new THREE.Group();
    arcadeMachineGroup.position.set(arcadePos.x, 0, arcadePos.z);
    arcadeMachineGroup.rotation.y = -Math.PI / 2 - 0.35;

    const cabGeo = new THREE.BoxGeometry(1.8, 3.2, 1.3);
    const cabMat = new THREE.MeshStandardMaterial({ color: 0x120826, roughness: 0.3, metalness: 0.4 });
    const cab = new THREE.Mesh(cabGeo, cabMat);
    cab.position.y = 1.6;
    arcadeMachineGroup.add(cab);

    const marqueeGeo = new THREE.BoxGeometry(1.85, 0.6, 1.35);
    const marqueeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: new THREE.Color(0xf59e0b),
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const marquee = new THREE.Mesh(marqueeGeo, marqueeMat);
    marquee.position.y = 3.35;
    arcadeMachineGroup.add(marquee);

    const arcScreenGeo = new THREE.PlaneGeometry(1.35, 1.05);
    const arcScreenMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
    const arcScreen = new THREE.Mesh(arcScreenGeo, arcScreenMat);
    arcScreen.position.set(0, 1.95, 0.66);
    arcScreen.rotation.x = -0.15;
    arcadeMachineGroup.add(arcScreen);

    const deckGeo = new THREE.BoxGeometry(1.65, 0.35, 0.75);
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x1f1438 });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(0, 1.3, 0.75);
    arcadeMachineGroup.add(deck);

    clickableTargets.push({ object: cab, type: "arcade" });
    scene.add(arcadeMachineGroup);

    // 7. 3D LASER TARGETING & IMPACT BEAM
    const laserMat = new THREE.LineBasicMaterial({ color: 0xff1e1e, linewidth: 3 });
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 1.2, 0),
      new THREE.Vector3(0, 1.2, 0),
    ]);
    const laserLine = new THREE.Line(laserGeo, laserMat);
    laserLine.visible = false;
    scene.add(laserLine);

    const laserDotGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const laserDotMat = new THREE.MeshBasicMaterial({ color: 0xff1e1e });
    const laserDot = new THREE.Mesh(laserDotGeo, laserDotMat);
    laserDot.visible = false;
    scene.add(laserDot);

    let freeLaserTarget: { pos: THREE.Vector3; expiresAt: number } | null = null;

    // 8. 3D CHARACTERS POOL (Fall-Guys / Mecha-Chameleon models with 8 Cute Skins)
    const characterMeshes: Record<
      string,
      {
        group: THREE.Group;
        body: THREE.Mesh;
        tail?: THREE.Mesh;
        accessory?: THREE.Mesh;
        badge: THREE.Sprite;
        leftEye: THREE.Mesh;
        rightEye: THREE.Mesh;
        leftFoot: THREE.Mesh;
        rightFoot: THREE.Mesh;
        isMe: boolean;
      }
    > = {};

    const buildCharacterModel = (player: MastermindPlayerInfo, isMe: boolean) => {
      const charGroup = new THREE.Group();
      const colorHex = player.color || "#0ea5e9";
      const skin = (player.skin as CharacterSkin) || (isMe ? currentSkin : "chameleon");

      // Cute Rounded Bean Body (Fall Guys / Mecha-Chameleon Style)
      const bodyGeo = new THREE.CapsuleGeometry(0.48, 0.75, 16, 16);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        roughness: 0.25,
        metalness: 0.15,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.9;
      charGroup.add(body);

      // Glossy Visor Faceplate
      const visorGeo = new THREE.SphereGeometry(0.3, 16, 16);
      visorGeo.scale(1.15, 0.85, 0.35);
      const visorMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.05,
      });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 1.15, 0.38);
      charGroup.add(visor);

      // Cute Eyes (with blink animation)
      const eyeGeo = new THREE.SphereGeometry(0.055, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.1, 1.18, 0.48);
      charGroup.add(leftEye);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.1, 1.18, 0.48);
      charGroup.add(rightEye);

      // Cute Little Feet for Fall Guys waddling
      const footGeo = new THREE.SphereGeometry(0.13, 8, 8);
      footGeo.scale(1, 0.6, 1.3);
      const footMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
      const leftFoot = new THREE.Mesh(footGeo, footMat);
      leftFoot.position.set(-0.2, 0.12, 0.05);
      charGroup.add(leftFoot);
      const rightFoot = new THREE.Mesh(footGeo, footMat);
      rightFoot.position.set(0.2, 0.12, 0.05);
      charGroup.add(rightFoot);

      // 8 Distinct Cute Skins Accessories
      let tailMesh: THREE.Mesh | undefined;
      let accessoryMesh: THREE.Mesh | undefined;

      if (skin === "chameleon") {
        const tailGeo = new THREE.TorusGeometry(0.28, 0.08, 8, 20, Math.PI * 1.6);
        const tailMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colorHex), roughness: 0.3 });
        tailMesh = new THREE.Mesh(tailGeo, tailMat);
        tailMesh.position.set(0, 0.7, -0.44);
        tailMesh.rotation.y = Math.PI / 2;
        charGroup.add(tailMesh);

        const crestGeo = new THREE.ConeGeometry(0.12, 0.42, 6);
        const crestMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const crest = new THREE.Mesh(crestGeo, crestMat);
        crest.position.set(0, 1.52, 0.1);
        crest.rotation.x = -Math.PI / 6;
        charGroup.add(crest);
      } else if (skin === "monarch") {
        const crownGeo = new THREE.TorusGeometry(0.35, 0.06, 8, 16);
        const crownMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
        accessoryMesh = new THREE.Mesh(crownGeo, crownMat);
        accessoryMesh.position.set(0, 1.68, 0);
        accessoryMesh.rotation.x = Math.PI / 2;
        charGroup.add(accessoryMesh);
      } else if (skin === "mecha") {
        const podGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.45, 10);
        const podMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
        const podL = new THREE.Mesh(podGeo, podMat);
        podL.position.set(-0.52, 1.1, 0);
        charGroup.add(podL);
        const podR = new THREE.Mesh(podGeo, podMat);
        podR.position.set(0.52, 1.1, 0);
        charGroup.add(podR);
      } else if (skin === "neko") {
        const earGeo = new THREE.ConeGeometry(0.14, 0.32, 4);
        const earMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e });
        const earL = new THREE.Mesh(earGeo, earMat);
        earL.position.set(-0.25, 1.6, 0.05);
        charGroup.add(earL);
        const earR = new THREE.Mesh(earGeo, earMat);
        earR.position.set(0.25, 1.6, 0.05);
        charGroup.add(earR);
      } else if (skin === "shadow") {
        const cowlGeo = new THREE.TorusGeometry(0.38, 0.14, 8, 16);
        const cowlMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
        const cowl = new THREE.Mesh(cowlGeo, cowlMat);
        cowl.position.set(0, 1.3, 0);
        cowl.rotation.x = Math.PI / 2;
        charGroup.add(cowl);
      } else if (skin === "dino") {
        for (let k = 0; k < 4; k++) {
          const spikeGeo = new THREE.ConeGeometry(0.08, 0.22, 4);
          const spikeMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
          const sp = new THREE.Mesh(spikeGeo, spikeMat);
          sp.position.set(0, 1.3 - k * 0.22, -0.44);
          sp.rotation.x = -Math.PI / 3;
          charGroup.add(sp);
        }
      } else if (skin === "bunny") {
        const bEarGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.62, 8);
        const bEarMat = new THREE.MeshStandardMaterial({ color: 0xec4899 });
        const bEarL = new THREE.Mesh(bEarGeo, bEarMat);
        bEarL.position.set(-0.2, 1.75, -0.05);
        bEarL.rotation.z = 0.15;
        charGroup.add(bEarL);
        const bEarR = new THREE.Mesh(bEarGeo, bEarMat);
        bEarR.position.set(0.2, 1.75, -0.05);
        bEarR.rotation.z = -0.15;
        charGroup.add(bEarR);
      } else if (skin === "cosmo") {
        const bubbleGeo = new THREE.SphereGeometry(0.55, 16, 16);
        const bubbleMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          transparent: true,
          opacity: 0.35,
          metalness: 0.9,
          roughness: 0.1,
        });
        const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
        bubble.position.set(0, 1.25, 0);
        charGroup.add(bubble);
      }

      // Live 3D Floating Name Badge
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.roundRect(4, 4, 248, 56, 16);
        ctx.fill();
        ctx.strokeStyle = isMe ? "#00f0ff" : "#475569";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.font = "bold 22px sans-serif";
        ctx.fillStyle = isMe ? "#38bdf8" : "#f8fafc";
        ctx.textAlign = "center";
        ctx.fillText(`${player.avatar} ${player.name}${isMe ? " (YOU)" : ""}`, 128, 40);
      }
      const badgeTex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: badgeTex, transparent: true });
      const badge = new THREE.Sprite(spriteMat);
      badge.scale.set(1.9, 0.52, 1);
      badge.position.set(0, 2.15, 0);
      charGroup.add(badge);

      scene.add(charGroup);

      return {
        group: charGroup,
        body,
        tail: tailMesh,
        accessory: accessoryMesh,
        badge,
        leftEye,
        rightEye,
        leftFoot,
        rightFoot,
        isMe,
      };
    };

    // My Assigned Seat Index
    const mySeatIndex = Math.max(0, playerList.findIndex(([pid]) => pid === myId));
    const myAssignedSeat = chairPositions[mySeatIndex % chairPositions.length] || { x: 0, z: chairRadius, rotation: 0 };

    // Setup initial local player position
    localPosRef.current.x = myAssignedSeat.x;
    localPosRef.current.z = myAssignedSeat.z;
    localPosRef.current.rotation = myAssignedSeat.rotation;
    camYawRef.current = myAssignedSeat.rotation + Math.PI; // Face the table

    // Spawn character models
    playerList.forEach(([pid, p], idx) => {
      const isMe = pid === myId;
      const model = buildCharacterModel(p, isMe);
      const seat = chairPositions[idx % chairPositions.length];
      const px = seat ? seat.x : (p.x ?? 0);
      const pz = seat ? seat.z : (p.z ?? 0);
      const rot = seat ? seat.rotation : (p.rotation ?? 0);

      model.group.position.set(px, 0.35, pz);
      model.group.rotation.y = rot;
      characterMeshes[pid] = model;
      clickableTargets.push({ object: model.group, type: "player", id: pid });
    });

    // 9. ACTIVE 3D PROJECTILES & SPLASH PARTICLES POOLS
    const activeProjectiles: ActiveProjectile3D[] = [];
    const activeSplashes: ActiveSplash3D[] = [];

    const createProjectileMesh = (item: string) => {
      if (item === "tomato") {
        const geo = new THREE.SphereGeometry(0.25, 12, 12);
        const mat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
        return new THREE.Mesh(geo, mat);
      }
      if (item === "balloon") {
        const geo = new THREE.SphereGeometry(0.3, 12, 12);
        geo.scale(1, 1.25, 1);
        const mat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.1, transparent: true, opacity: 0.85 });
        return new THREE.Mesh(geo, mat);
      }
      if (item === "popper") {
        const geo = new THREE.ConeGeometry(0.2, 0.45, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0xa855f7 });
        return new THREE.Mesh(geo, mat);
      }
      if (item === "duck") {
        const group = new THREE.Group();
        const bodyGeo = new THREE.SphereGeometry(0.22, 10, 10);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2 });
        group.add(new THREE.Mesh(bodyGeo, bodyMat));
        const headGeo = new THREE.SphereGeometry(0.14, 8, 8);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.set(0, 0.18, 0.12);
        group.add(head);
        return group;
      }
      const geo = new THREE.SphereGeometry(0.26, 12, 12);
      const mat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 });
      return new THREE.Mesh(geo, mat);
    };

    const triggerSplashEffect = (pos: THREE.Vector3, item: string) => {
      const splashGroup = new THREE.Group();
      splashGroup.position.copy(pos);
      const particles: Array<{ mesh: THREE.Mesh; velocity: THREE.Vector3 }> = [];

      let splashColor = 0xef4444;
      if (item === "balloon") splashColor = 0x06b6d4;
      if (item === "popper") splashColor = 0xf59e0b;
      if (item === "duck") splashColor = 0xfacc15;
      if (item === "bomb") splashColor = 0x71717a;

      for (let i = 0; i < 14; i++) {
        const pGeo = new THREE.SphereGeometry(0.06, 6, 6);
        const pMat = new THREE.MeshBasicMaterial({ color: splashColor });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        splashGroup.add(pMesh);

        const velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 4.5,
          Math.random() * 3.5 + 1.0,
          (Math.random() - 0.5) * 4.5
        );
        particles.push({ mesh: pMesh, velocity });
      }

      scene.add(splashGroup);
      activeSplashes.push({
        group: splashGroup,
        particles,
        startTime: performance.now(),
        duration: 650,
      });
    };

    // 10. DRAG-TO-LOOK CAMERA & CLICK-RAYCASTING
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let isPointerDown = false;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let prevPointerX = 0;
    let prevPointerY = 0;
    let hasDragged = false;

    const onPointerDown = (e: PointerEvent) => {
      isPointerDown = true;
      pointerStartX = e.clientX;
      pointerStartY = e.clientY;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
      hasDragged = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDown) return;
      const dx = e.clientX - pointerStartX;
      const dy = e.clientY - pointerStartY;
      if (Math.hypot(dx, dy) > 4) {
        hasDragged = true;
      }
      if (hasDragged) {
        const deltaX = e.clientX - prevPointerX;
        const deltaY = e.clientY - prevPointerY;
        camYawRef.current -= deltaX * 0.0055;
        camPitchRef.current = Math.max(-0.25, Math.min(1.22, camPitchRef.current - deltaY * 0.0055));
        prevPointerX = e.clientX;
        prevPointerY = e.clientY;
      }
    };

    const onWheel = (e: WheelEvent) => {
      camDistRef.current = Math.max(2.0, Math.min(11.5, camDistRef.current + e.deltaY * 0.005));
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isPointerDown) return;
      isPointerDown = false;

      // If user merely tapped without dragging: raycast!
      if (!hasDragged) {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const targetObjects = clickableTargets.map((ct) => ct.object);
        const targetIntersects = raycaster.intersectObjects(targetObjects, true);

        if (targetIntersects.length > 0) {
          const hit = targetIntersects[0];
          let found = clickableTargets.find((ct) => ct.object === hit.object);
          if (!found) {
            found = clickableTargets.find((ct) => {
              let p: THREE.Object3D | null = hit.object;
              while (p) {
                if (p === ct.object) return true;
                p = p.parent;
              }
              return false;
            });
          }

          if (found) {
            if (found.type === "arcade") {
              if (onOpenShop) onOpenShop();
              if (onInteract) onInteract("arcade");
              return;
            }
            if (found.type === "tablet") {
              if (onOpenCrafting) onOpenCrafting();
              if (onInteract) onInteract("tablet");
              return;
            }
            if (found.type === "player" && found.id && found.id !== myId) {
              if (onSelectTargetPlayer) onSelectTargetPlayer(found.id);
              freeLaserTarget = { pos: hit.point.clone(), expiresAt: performance.now() + 3000 };
              return;
            }
          }
        }

        // Aim laser pointer at table or floor
        const floorIntersects = raycaster.intersectObjects([tableMesh, foundationMesh], false);
        if (floorIntersects.length > 0) {
          const pt = floorIntersects[0].point;
          freeLaserTarget = { pos: pt.clone(), expiresAt: performance.now() + 3000 };
        }
      }
    };

    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    container.addEventListener("wheel", onWheel, { passive: true });

    // 11. MAIN ANIMATION & GAME LOOP
    let animId: number;
    let clock = new THREE.Clock();
    let walkClock = 0;
    let lastNetworkSync = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.getElapsedTime();
      const now = performance.now();

      // Spin crystal in table center
      crystalMesh.rotation.y += 0.8 * dt;
      crystalMesh.rotation.x = Math.sin(elapsedTime * 1.5) * 0.2;
      marquee.material.emissiveIntensity = 0.5 + Math.sin(elapsedTime * 3) * 0.3;

      // Update 3D Projectiles
      while (throwQueueRef.current.length > 0) {
        const itemEvent = throwQueueRef.current.shift()!;
        const mesh = createProjectileMesh(itemEvent.item);
        mesh.position.copy(itemEvent.fromPos);
        scene.add(mesh);

        activeProjectiles.push({
          id: String(Math.random()),
          mesh,
          start: itemEvent.fromPos,
          target: itemEvent.toPos,
          startTime: now,
          duration: 750,
          item: itemEvent.item,
        });
      }

      for (let i = activeProjectiles.length - 1; i >= 0; i--) {
        const p = activeProjectiles[i];
        const progress = Math.min(1.0, (now - p.startTime) / p.duration);
        p.mesh.position.x = THREE.MathUtils.lerp(p.start.x, p.target.x, progress);
        p.mesh.position.z = THREE.MathUtils.lerp(p.start.z, p.target.z, progress);
        const arcY = Math.sin(progress * Math.PI) * 4.2;
        p.mesh.position.y = THREE.MathUtils.lerp(p.start.y, p.target.y, progress) + arcY;
        p.mesh.rotation.x += 8.0 * dt;
        p.mesh.rotation.y += 5.0 * dt;

        if (progress >= 1.0) {
          triggerSplashEffect(p.target, p.item);
          scene.remove(p.mesh);
          activeProjectiles.splice(i, 1);
        }
      }

      // Update Splash Particles
      for (let sIdx = activeSplashes.length - 1; sIdx >= 0; sIdx--) {
        const splash = activeSplashes[sIdx];
        const spProg = (now - splash.startTime) / splash.duration;
        splash.particles.forEach((part) => {
          part.mesh.position.addScaledVector(part.velocity, dt);
          part.velocity.y -= 9.8 * dt;
        });

        if (spProg >= 1.0) {
          scene.remove(splash.group);
          activeSplashes.splice(sIdx, 1);
        }
      }

      // 3D Laser Line & Impact Dot
      let laserActive = false;
      let targetPoint: THREE.Vector3 | null = null;

      if (selectedTargetId && characterMeshes[selectedTargetId] && characterMeshes[myId]) {
        targetPoint = characterMeshes[selectedTargetId].group.position.clone();
        targetPoint.y = 1.25;
        laserActive = true;
      } else if (freeLaserTarget && now < freeLaserTarget.expiresAt && characterMeshes[myId]) {
        targetPoint = freeLaserTarget.pos.clone();
        laserActive = true;
      }

      if (laserActive && targetPoint && characterMeshes[myId]) {
        const myP = characterMeshes[myId].group.position;
        const startPt = new THREE.Vector3(myP.x, 1.22, myP.z);
        laserLine.geometry.setFromPoints([startPt, targetPoint]);
        laserLine.visible = true;

        laserDot.position.copy(targetPoint);
        laserDot.scale.setScalar(1 + Math.sin(elapsedTime * 15) * 0.25);
        laserDot.visible = true;
      } else {
        laserLine.visible = false;
        laserDot.visible = false;
      }

      // =====================================================================
      // FALL GUYS LOCAL PLAYER CONTROLLER & PHYSICS
      // =====================================================================
      let inputX = 0;
      let inputZ = 0;
      if (keysPressedRef.current["KeyW"] || keysPressedRef.current["ArrowUp"]) inputZ -= 1;
      if (keysPressedRef.current["KeyS"] || keysPressedRef.current["ArrowDown"]) inputZ += 1;
      if (keysPressedRef.current["KeyA"] || keysPressedRef.current["ArrowLeft"]) inputX -= 1;
      if (keysPressedRef.current["KeyD"] || keysPressedRef.current["ArrowRight"]) inputX += 1;

      if (joystickDirRef.current.x !== 0 || joystickDirRef.current.y !== 0) {
        inputX = joystickDirRef.current.x;
        inputZ = joystickDirRef.current.y;
      }

      const hasMoveInput = inputX !== 0 || inputZ !== 0;

      if (hasMoveInput) {
        if (localPosRef.current.isSeated) {
          localPosRef.current.isSeated = false;
          setIsSeated(false);
        }

        // Camera-Relative Movement Direction
        const fwdX = Math.sin(camYawRef.current);
        const fwdZ = -Math.cos(camYawRef.current);
        const rightX = -Math.cos(camYawRef.current);
        const rightZ = -Math.sin(camYawRef.current);

        const moveDirX = inputX * rightX - inputZ * fwdX;
        const moveDirZ = inputX * rightZ - inputZ * fwdZ;
        const moveMag = Math.hypot(moveDirX, moveDirZ);

        if (moveMag > 0.001) {
          const speed = 5.6; // m/s
          const ndx = (moveDirX / moveMag) * speed * dt;
          const ndz = (moveDirZ / moveMag) * speed * dt;
          let nextX = localPosRef.current.x + ndx;
          let nextZ = localPosRef.current.z + ndz;

          // Chamber Perimeter Wall Collision
          const distCenter = Math.hypot(nextX, nextZ);
          if (distCenter > 13.8) {
            const sc = 13.8 / distCenter;
            nextX *= sc;
            nextZ *= sc;
          }

          // Center Round Table Collision
          if (distCenter < tableRadius + 0.35) {
            const sc = (tableRadius + 0.35) / distCenter;
            nextX *= sc;
            nextZ *= sc;
          }

          localPosRef.current.x = nextX;
          localPosRef.current.z = nextZ;
          localPosRef.current.rotation = Math.atan2(moveDirX, moveDirZ);
          localPosRef.current.isMoving = true;
        }
      } else {
        localPosRef.current.isMoving = false;
      }

      // Vertical Gravity & Jump Physics
      if (localPosRef.current.yVel !== 0 || localPosRef.current.y > 0.35) {
        localPosRef.current.y += localPosRef.current.yVel * dt;
        localPosRef.current.yVel -= 18.0 * dt;
        if (localPosRef.current.y <= 0.35) {
          localPosRef.current.y = 0.35;
          localPosRef.current.yVel = 0;
        }
      }

      // Local player mesh update
      const myModel = characterMeshes[myId];
      if (myModel) {
        if (localPosRef.current.isSeated) {
          // Seated in assigned cyber chair
          myModel.group.position.set(myAssignedSeat.x, 0.35, myAssignedSeat.z);
          myModel.group.rotation.y = myAssignedSeat.rotation;
          myModel.body.rotation.z = 0;
          myModel.body.position.y = 0.9;
          myModel.leftFoot.position.y = 0.12;
          myModel.rightFoot.position.y = 0.12;
        } else {
          // Walking & Jumping Free Roam
          myModel.group.position.set(localPosRef.current.x, localPosRef.current.y, localPosRef.current.z);
          myModel.group.rotation.y = localPosRef.current.rotation;

          if (localPosRef.current.isMoving) {
            walkClock += dt;
            // Fall Guys Iconic Waddle Wobble!
            myModel.body.rotation.z = Math.sin(walkClock * 14) * 0.18;
            myModel.body.position.y = 0.9 + Math.abs(Math.sin(walkClock * 14)) * 0.14;
            myModel.leftFoot.position.y = 0.12 + Math.max(0, Math.sin(walkClock * 14)) * 0.22;
            myModel.rightFoot.position.y = 0.12 + Math.max(0, -Math.sin(walkClock * 14)) * 0.22;
            if (myModel.tail) myModel.tail.rotation.z = Math.sin(walkClock * 14) * 0.3;
          } else {
            myModel.body.rotation.z = 0;
            myModel.body.position.y = 0.9 + Math.sin(elapsedTime * 2.5) * 0.02;
            myModel.leftFoot.position.y = 0.12;
            myModel.rightFoot.position.y = 0.12;
          }

          // Jump squash & stretch
          if (localPosRef.current.y > 0.36) {
            myModel.body.scale.set(0.88, 1.18, 0.88);
          } else {
            myModel.body.scale.set(1.0, 1.0, 1.0);
          }
        }

        const blink = Math.sin(elapsedTime * 1.8) > 0.96 ? 0.1 : 1.0;
        myModel.leftEye.scale.y = blink;
        myModel.rightEye.scale.y = blink;
      }

      // Update Remote Players from gameState
      playerList.forEach(([pid, p], idx) => {
        if (pid === myId) return;
        let model = characterMeshes[pid];
        if (!model) {
          model = buildCharacterModel(p, false);
          characterMeshes[pid] = model;
          clickableTargets.push({ object: model.group, type: "player", id: pid });
        }

        if (p.x !== undefined && p.z !== undefined && (p.x !== 0 || p.z !== 0)) {
          model.group.position.x += (p.x - model.group.position.x) * 0.2;
          model.group.position.z += (p.z - model.group.position.z) * 0.2;
          if (p.rotation !== undefined) model.group.rotation.y = p.rotation;
        } else {
          const seat = chairPositions[idx % chairPositions.length];
          if (seat) {
            model.group.position.set(seat.x, 0.35, seat.z);
            model.group.rotation.y = seat.rotation;
          }
        }

        model.body.rotation.z = Math.sin(elapsedTime * 2.0 + idx) * 0.04;
        model.group.position.y = 0.35 + Math.sin(elapsedTime * 2.5 + idx) * 0.02;
      });

      // =====================================================================
      // DYNAMIC 3RD-PERSON ORBIT & IN-TABLE SCREEN CAMERA
      // =====================================================================
      if (isFocusingTableScreen) {
        // Tilted down directly at the player's in-table desk monitor
        const camX = myAssignedSeat.x * 1.32;
        const camY = 2.38;
        const camZ = myAssignedSeat.z * 1.32;
        camera.position.x += (camX - camera.position.x) * 0.12;
        camera.position.y += (camY - camera.position.y) * 0.12;
        camera.position.z += (camZ - camera.position.z) * 0.12;
        camera.lookAt(myAssignedSeat.x * 0.62, 1.18, myAssignedSeat.z * 0.62);
      } else {
        // Free Look Orbit Camera behind Player
        const pTargetX = localPosRef.current.isSeated ? myAssignedSeat.x : localPosRef.current.x;
        const pTargetZ = localPosRef.current.isSeated ? myAssignedSeat.z : localPosRef.current.z;
        const pTargetY = localPosRef.current.isSeated ? 1.25 : localPosRef.current.y + 0.9;

        const targetLook = new THREE.Vector3(pTargetX, pTargetY, pTargetZ);
        const desiredCamX = targetLook.x + Math.sin(camYawRef.current) * Math.cos(camPitchRef.current) * camDistRef.current;
        let desiredCamY = targetLook.y + Math.sin(camPitchRef.current) * camDistRef.current;
        const desiredCamZ = targetLook.z + Math.cos(camYawRef.current) * Math.cos(camPitchRef.current) * camDistRef.current;

        // Clamp camera inside the chamber room
        desiredCamY = Math.max(0.65, Math.min(roomHeight - 0.4, desiredCamY));
        let distH = Math.hypot(desiredCamX, desiredCamZ);
        let finalCamX = desiredCamX;
        let finalCamZ = desiredCamZ;
        if (distH > roomRadius - 0.7) {
          const sc = (roomRadius - 0.7) / distH;
          finalCamX *= sc;
          finalCamZ *= sc;
        }

        camera.position.x += (finalCamX - camera.position.x) * 0.18;
        camera.position.y += (desiredCamY - camera.position.y) * 0.18;
        camera.position.z += (finalCamZ - camera.position.z) * 0.18;
        camera.lookAt(targetLook);
      }

      // Check Proximity to Room Points of Interest
      const distToArcade = Math.hypot(localPosRef.current.x - (tableRadius + 3.8), localPosRef.current.z - (-1.8));
      const distToSeat = Math.hypot(localPosRef.current.x - myAssignedSeat.x, localPosRef.current.z - myAssignedSeat.z);
      const distToCenter = Math.hypot(localPosRef.current.x, localPosRef.current.z);

      if (distToArcade < 3.2) {
        setNearbyInteractable({ type: "arcade", label: "🕹️ Arcade Black Market" });
      } else if (distToSeat < 1.6 && !localPosRef.current.isSeated) {
        setNearbyInteractable({ type: "table", label: "🪑 Sit at Your Desk" });
      } else if (distToCenter < tableRadius + 1.8) {
        setNearbyInteractable({ type: "tablet", label: "📱 In-Table Crafting Tablet" });
      } else {
        setNearbyInteractable(null);
      }

      // Network Sync (Throttle to 50ms)
      const curNow = performance.now();
      if (curNow - lastNetworkSync > 50 && onMovePlayer) {
        onMovePlayer(
          Math.round(localPosRef.current.x * 100) / 100,
          Math.round(localPosRef.current.z * 100) / 100,
          Math.round(localPosRef.current.rotation * 100) / 100,
          localPosRef.current.isMoving,
          currentSkin,
          "Council Chamber"
        );
        lastNetworkSync = curNow;
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [gameState.worldScraps, myId, currentSkin, phase, selectedTargetId, isFocusingTableScreen, onMovePlayer, onCollectScrap]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950 text-white font-sans">
      {/* 1. 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none" />

      {/* 2. ON-SCREEN CAMERA & CONTROLS HELPER BAR (Top Center) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={() => {
            if (onToggleFocusTableScreen) {
              onToggleFocusTableScreen(!isFocusingTableScreen);
            }
          }}
          className="px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-cyan-500/50 text-xs font-mono font-bold text-cyan-300 hover:text-white flex items-center gap-1.5 shadow-xl backdrop-blur-md active:scale-95 transition"
        >
          {isFocusingTableScreen ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <Tv className="w-3.5 h-3.5 text-cyan-400" />}
          <span>{isFocusingTableScreen ? "Look Around Room" : "Focus Table Screen"}</span>
        </button>

        <button
          onClick={() => toggleSit()}
          className="px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-700 text-xs font-mono font-bold text-slate-300 hover:text-white flex items-center gap-1.5 shadow-xl backdrop-blur-md active:scale-95 transition"
        >
          <span>{isSeated ? "🚶 Stand Up" : "🪑 Sit Down"}</span>
        </button>

        <div className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-slate-400 backdrop-blur-md">
          <span>🖱️ Drag to look around</span>
          <span>•</span>
          <span>WASD to walk</span>
          <span>•</span>
          <span>Space to jump</span>
        </div>
      </div>

      {/* 3. COUNCIL CHAMBER RADAR (Top-Right) */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1 pointer-events-none">
        <div
          className={`${
            minimapExpanded ? "w-60 h-60" : "w-32 h-32 md:w-36 md:h-36"
          } rounded-2xl bg-slate-950/90 border-2 border-cyan-500/50 backdrop-blur-md shadow-2xl p-2 relative overflow-hidden pointer-events-auto transition-all duration-300`}
        >
          <svg viewBox="-20 -20 40 40" className="w-full h-full">
            <circle cx="0" cy="0" r="17" fill="#040812" stroke="#1e293b" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="14.5" fill="none" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="1.5,1.5" />
            <circle cx="0" cy="0" r="5" fill="#0b172a" stroke="#00f0ff" strokeWidth="0.9" />
            <circle cx="0" cy="0" r="1.2" fill="#00f0ff" opacity="0.6" />
            <rect x="9.5" y="-3.5" width="2.2" height="3.5" rx="0.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.4" />

            {Object.entries(gameState.players).map(([pid, p], idx) => {
              const isMe = pid === myId;
              const px = isMe ? localPosRef.current.x : (p.x ?? 0);
              const pz = isMe ? localPosRef.current.z : (p.z ?? 0);

              return (
                <g key={pid}>
                  <circle
                    cx={px}
                    cy={pz}
                    r={isMe ? 2.0 : 1.4}
                    fill={p.color || "#0ea5e9"}
                    stroke={isMe ? "#00f0ff" : "#ffffff"}
                    strokeWidth={isMe ? 0.8 : 0.4}
                  />
                  {isMe && (
                    <circle cx={px} cy={pz} r="3.2" fill="none" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" className="animate-ping" />
                  )}
                </g>
              );
            })}
          </svg>

          <button
            onClick={() => setMinimapExpanded((o) => !o)}
            className="absolute bottom-1 right-1 p-1 rounded-lg bg-slate-900/90 text-cyan-400 hover:text-white border border-cyan-500/40"
          >
            {minimapExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 backdrop-blur-md">
          <MapPin className="w-3 h-3 text-amber-400" />
          <span className="font-bold truncate max-w-[140px]">Council Chamber</span>
        </div>
      </div>

      {/* 4. TOP-LEFT HUD: Operative Profile & Skins Button */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
          <span className="text-xl">{myPlayer?.avatar}</span>
          <div className="flex flex-col">
            <span className="text-xs font-black text-white leading-tight">{myPlayer?.name} (YOU)</span>
            <span className="text-[10px] font-mono capitalize" style={{ color: themePrimary }}>
              {myPlayer?.role} • {myPlayer?.coins || 50}c
            </span>
          </div>
        </div>

        <button
          onClick={() => setSkinDrawerOpen((o) => !o)}
          className="px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 text-xs font-black text-cyan-300 hover:text-white flex items-center gap-1.5 shadow-lg backdrop-blur-md active:scale-95 transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Skins</span>
        </button>
      </div>

      {/* 5. FLOATING PROXIMITY INTERACTION PROMPT */}
      {nearbyInteractable && phase !== "round_table_meeting" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-16 z-30 flex flex-col items-center gap-1 animate-bounce pointer-events-auto">
          <button
            onClick={() => {
              if (nearbyInteractable.type === "table") {
                toggleSit();
              } else if (onInteract) {
                onInteract(nearbyInteractable.type, nearbyInteractable.id);
              }
              if (nearbyInteractable.type === "arcade" && onOpenShop) onOpenShop();
              if (nearbyInteractable.type === "tablet" && onOpenCrafting) onOpenCrafting();
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-2xl flex items-center gap-2 border border-white/50"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>{nearbyInteractable.label} (Press E or Tap)</span>
          </button>
        </div>
      )}

      {/* 6. VIRTUAL JOYSTICK (Bottom-Left - Mobile Movement) */}
      {!hideDefaultHud && (
        <div className="absolute bottom-6 left-6 z-30 touch-none select-none">
          <div
            ref={joystickBaseRef}
            onTouchStart={handleJoystickTouchStart}
            onTouchMove={handleJoystickTouchMove}
            onTouchEnd={handleJoystickTouchEnd}
            onMouseDown={handleJoystickTouchStart}
            onMouseMove={handleJoystickTouchMove}
            onMouseUp={handleJoystickTouchEnd}
            className="w-28 h-28 rounded-full bg-slate-900/75 border-2 border-cyan-500/50 backdrop-blur-md flex items-center justify-center relative shadow-2xl cursor-pointer"
          >
            <div
              style={{
                transform: `translate(${joystickKnob.x}px, ${joystickKnob.y}px)`,
              }}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 border-2 border-white shadow-lg flex items-center justify-center transition-transform duration-75"
            >
              <Navigation className="w-5 h-5 text-slate-950 transform rotate-45" />
            </div>
          </div>
          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest text-center block mt-1">
            Touch Joystick
          </span>
        </div>
      )}

      {/* 7. BOTTOM-RIGHT ACTION HOTBAR */}
      {!hideDefaultHud && (
        <div className="absolute bottom-6 right-6 z-30 flex items-end gap-2.5">
          {onOpenShop && (
            <button
              onClick={onOpenShop}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 border border-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 active:scale-95 transition"
              title="Arcade Black Market"
            >
              <ShoppingCart className="w-6 h-6 stroke-[2.5]" />
            </button>
          )}

          {/* Throw Item Button */}
          <div className="relative">
            {throwWheelOpen && (
              <div className="absolute bottom-full right-0 mb-2 p-2 rounded-2xl bg-slate-900/95 border border-amber-500/50 backdrop-blur-md grid grid-cols-5 gap-1.5 shadow-2xl z-40">
                <button
                  onClick={() => handleThrow("tomato")}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-xl flex items-center justify-center active:scale-90 transition"
                  title="Throw Tomato"
                >
                  🍅
                </button>
                <button
                  onClick={() => handleThrow("balloon")}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-xl flex items-center justify-center active:scale-90 transition"
                  title="Throw Water Balloon"
                >
                  🎈
                </button>
                <button
                  onClick={() => handleThrow("popper")}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-xl flex items-center justify-center active:scale-90 transition"
                  title="Party Popper"
                >
                  🎉
                </button>
                <button
                  onClick={() => handleThrow("duck")}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-xl flex items-center justify-center active:scale-90 transition"
                  title="Throw Rubber Duck"
                >
                  🦆
                </button>
                <button
                  onClick={() => handleThrow("bomb")}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-xl flex items-center justify-center active:scale-90 transition"
                  title="Toy Bomb"
                >
                  💣
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setThrowWheelOpen((o) => !o);
                setEmoteWheelOpen(false);
              }}
              className="w-12 h-12 rounded-2xl bg-slate-900/90 border border-slate-700 hover:border-amber-400 text-amber-300 text-xl flex items-center justify-center shadow-lg backdrop-blur-md active:scale-95 transition"
              title="Throw Fun 3D Items"
            >
              🎯
            </button>
          </div>

          {/* Emote Button */}
          <div className="relative">
            {emoteWheelOpen && (
              <div className="absolute bottom-full right-0 mb-2 p-2 rounded-2xl bg-slate-900/95 border border-cyan-500/50 backdrop-blur-md grid grid-cols-5 gap-1.5 shadow-2xl z-40">
                {["🎯", "👀", "🤫", "🍿", "😂", "🤔", "😤", "🫵", "❤️", "🔥"].map((em) => (
                  <button
                    key={em}
                    onClick={() => handleSendEmote(em)}
                    className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-lg flex items-center justify-center active:scale-90 transition"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => {
                setEmoteWheelOpen((o) => !o);
                setThrowWheelOpen(false);
              }}
              className="w-12 h-12 rounded-2xl bg-slate-900/90 border border-slate-700 hover:border-cyan-400 text-cyan-300 text-xl flex items-center justify-center shadow-lg backdrop-blur-md active:scale-95 transition"
              title="Express Emote"
            >
              <Smile className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* 8. SKINS SELECTION DRAWER */}
      {skinDrawerOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-cyan-500/50 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black tracking-wider uppercase text-cyan-300">
                  Operative Skin Bay (Fall-Guys & Mecha)
                </h3>
              </div>
              <button
                onClick={() => setSkinDrawerOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {SKIN_LIST.map((s) => {
                const isSelected = currentSkin === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleChooseSkin(s.id)}
                    className={`p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                      isSelected
                        ? "bg-cyan-950/80 border-cyan-400 shadow-md shadow-cyan-950"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{s.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{s.name}</span>
                          {isSelected && (
                            <span className="text-[9px] px-1.5 rounded bg-cyan-900 text-cyan-300 font-bold">
                              EQUIPPED
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{s.desc}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
