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

  // Local Player Movement & Physics State
  const localPosRef = useRef({ x: 0, z: 0, rotation: 0, isMoving: false });
  const targetPosRef = useRef<{ x: number; z: number } | null>(null);
  const joystickDirRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [currentSkin, setCurrentSkin] = useState<CharacterSkin>((myPlayer?.skin as CharacterSkin) || "chameleon");
  const [skinDrawerOpen, setSkinDrawerOpen] = useState(false);
  const [currentSectorName, setCurrentSectorName] = useState("Lockdown Room (Central Core)");
  const [minimapExpanded, setMinimapExpanded] = useState(false);

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
    // Find target player
    const otherPlayers = Object.entries(gameState.players).filter(([id]) => id !== myId);
    let targetPlayer = otherPlayers[0]?.[1];
    let targetPid = otherPlayers[0]?.[0];

    if (selectedTargetId && gameState.players[selectedTargetId]) {
      targetPlayer = gameState.players[selectedTargetId];
      targetPid = selectedTargetId;
    } else {
      // Find closest player
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

  // =========================================================================
  // KEYBOARD CONTROLS (WASD / Arrows / E to interact / B for shop)
  // =========================================================================
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = true;
      if (e.code === "KeyE" && nearbyInteractable) {
        if (onInteract) onInteract(nearbyInteractable.type, nearbyInteractable.id);
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
  }, [nearbyInteractable, onInteract, onOpenShop]);

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

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    camera.position.set(0, 19, 17);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 2. Dynamic Lighting System
    const ambientLight = new THREE.AmbientLight(0x1e293b, 2.6);
    scene.add(ambientLight);

    const mainCenterLight = new THREE.PointLight(0x00f0ff, 5.0, 150);
    mainCenterLight.position.set(0, 14, 0);
    mainCenterLight.castShadow = true;
    scene.add(mainCenterLight);

    const northLight = new THREE.PointLight(0x38bdf8, 3.2, 90);
    northLight.position.set(0, 9, -20);
    scene.add(northLight);

    const southLight = new THREE.PointLight(0xf59e0b, 3.2, 90);
    southLight.position.set(0, 9, 20);
    scene.add(southLight);

    const westLight = new THREE.PointLight(0x10b981, 3.2, 90);
    westLight.position.set(-20, 9, 0);
    scene.add(westLight);

    const eastLight = new THREE.PointLight(0xeab308, 3.2, 90);
    eastLight.position.set(20, 9, 0);
    scene.add(eastLight);

    // 3. UNIFIED FACILITY FOUNDATION (Outer Boundary)
    const foundationGeo = new THREE.BoxGeometry(80, 0.4, 80);
    const foundationMat = new THREE.MeshPhongMaterial({
      color: 0x050d1a,
      shininess: 95,
    });
    const foundationMesh = new THREE.Mesh(foundationGeo, foundationMat);
    foundationMesh.position.set(0, 0.1, 0);
    foundationMesh.receiveShadow = true;
    scene.add(foundationMesh);

    // Neon Floor Grid
    const gridHelper = new THREE.GridHelper(78, 39, 0x0284c7, 0x0a1f38);
    gridHelper.position.y = 0.32;
    scene.add(gridHelper);

    // 4. ARCHITECTURAL FACILITY ROOMS & WALLS (EXACTLY MATCHING BLUEPRINTS)
    OAKHAVEN_SECTORS.forEach((sec) => {
      const isDome = sec.shape === "circle";
      const roomGroup = new THREE.Group();
      roomGroup.position.set(sec.x, 0, sec.z);

      const h = sec.type === "corridor" ? 2.2 : 3.5;
      let geom: THREE.BufferGeometry;

      if (isDome) {
        geom = new THREE.CylinderGeometry(sec.radius || 6, sec.radius || 6, h, 36);
      } else if (sec.shape === "pentagon") {
        geom = new THREE.CylinderGeometry(sec.width / 2, sec.width / 2, h, 5);
      } else if (sec.shape === "octagon") {
        geom = new THREE.CylinderGeometry(sec.width / 2, sec.width / 2, h, 8);
      } else {
        geom = new THREE.BoxGeometry(sec.width, h, sec.depth);
      }

      // Translucent Hologram Walls
      const wallMat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(sec.wallColor),
        transparent: true,
        opacity: 0.18,
        shininess: 95,
        side: THREE.DoubleSide,
      });
      const wallMesh = new THREE.Mesh(geom, wallMat);
      wallMesh.position.y = h / 2;
      roomGroup.add(wallMesh);

      // Neon Frame Wireframe Edges
      const edgeGeo = new THREE.EdgesGeometry(geom);
      const edgeMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(sec.wallColor),
        linewidth: 1.5,
      });
      const edgeLine = new THREE.LineSegments(edgeGeo, edgeMat);
      edgeLine.position.y = h / 2;
      roomGroup.add(edgeLine);

      // Room Floor Plate
      let floorGeo: THREE.BufferGeometry;
      if (isDome) {
        floorGeo = new THREE.CircleGeometry((sec.radius || 6) - 0.1, 36);
      } else {
        floorGeo = new THREE.PlaneGeometry(sec.width - 0.15, sec.depth - 0.15);
      }
      const floorMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(sec.floorColor),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = Math.PI / 2;
      floorMesh.position.y = 0.33;
      roomGroup.add(floorMesh);

      scene.add(roomGroup);

      // Doorway Portals & Red Blast Gates
      sec.doors.forEach((door) => {
        const isRedGate = door.isLocked;
        const archGeo = new THREE.BoxGeometry(isRedGate ? 2.6 : 1.8, 2.4, 0.45);
        const archMat = new THREE.MeshStandardMaterial({
          color: isRedGate ? 0xef4444 : 0x00f0ff,
          emissive: isRedGate ? 0xef4444 : 0x00f0ff,
          emissiveIntensity: isRedGate ? 1.0 : 0.4,
          roughness: 0.2,
        });
        const archMesh = new THREE.Mesh(archGeo, archMat);
        archMesh.position.set(door.x, 1.2, door.z);
        scene.add(archMesh);
      });
    });

    // Central Square Wall framing the Ring (From Image 2 Blueprint)
    const centerFrameGeo = new THREE.BoxGeometry(26, 3.2, 26);
    const centerFrameEdges = new THREE.EdgesGeometry(centerFrameGeo);
    const centerFrameLine = new THREE.LineSegments(
      centerFrameEdges,
      new THREE.LineBasicMaterial({ color: 0x0284c7, linewidth: 2 })
    );
    centerFrameLine.position.set(0, 1.6, 0);
    scene.add(centerFrameLine);

    // 5. DYNAMIC HIGH-TECH ROUND TABLE (Scales with player count)
    const playerList = Object.entries(gameState.players);
    const pCount = Math.max(3, playerList.length || 4);
    // Table radius adapts dynamically so players are never crowded
    const tableRadius = Math.max(2.9, Math.min(6.2, 1.8 + pCount * 0.45));
    const chairRadius = tableRadius + 1.25;

    // A. Main Table Top (Sleek dark cyber metallic surface)
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
    tableEdge.position.set(0, 1.18, 0);
    scene.add(tableEdge);

    // Center holographic projector & spinning crystal (Panacea Matrix)
    const crystalGeo = new THREE.OctahedronGeometry(0.55, 0);
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    crystalMesh.position.set(0, 1.9, 0);
    scene.add(crystalMesh);

    // Center projector column rising from table center
    const projColGeo = new THREE.CylinderGeometry(0.04, 0.32, 2.8, 12, 1, true);
    const projColMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    const projCol = new THREE.Mesh(projColGeo, projColMat);
    projCol.position.set(0, 2.5, 0);
    scene.add(projCol);

    // B. Chairs, In-Table Embedded Monitors, and Crafting Tablets
    const chairPositions: Array<{ x: number; z: number; rotation: number; seatIndex: number }> = [];
    const clickableTargets: Array<{ object: THREE.Object3D; type: "arcade" | "tablet" | "player"; id?: string }> = [];

    for (let i = 0; i < pCount; i++) {
      const angle = (i * 2 * Math.PI) / pCount;
      const cx = Math.cos(angle) * chairRadius;
      const cz = Math.sin(angle) * chairRadius;
      const rotY = -angle + Math.PI / 2; // Face table center
      chairPositions.push({ x: cx, z: cz, rotation: rotY, seatIndex: i });

      // 1. Ergonomic Cyber Chair
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

      // 2. EMBEDDED IN-TABLE MONITOR (Inside the table directly in front of the chair)
      const screenDist = tableRadius - 0.72;
      const sx = Math.cos(angle) * screenDist;
      const sz = Math.sin(angle) * screenDist;

      const screenGroup = new THREE.Group();
      screenGroup.position.set(sx, 1.18, sz);
      screenGroup.rotation.y = rotY;

      // Inset bezel frame (beveled into table top)
      const bezelGeo = new THREE.BoxGeometry(0.92, 0.04, 0.56);
      const bezelMat = new THREE.MeshStandardMaterial({ color: 0x050c18, roughness: 0.2, metalness: 0.9 });
      const bezel = new THREE.Mesh(bezelGeo, bezelMat);
      screenGroup.add(bezel);

      // Embedded screen surface
      const scrnPlaneGeo = new THREE.PlaneGeometry(0.84, 0.48);
      const scrnPlaneMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
      });
      const scrnPlane = new THREE.Mesh(scrnPlaneGeo, scrnPlaneMat);
      scrnPlane.rotation.x = -Math.PI / 2;
      scrnPlane.position.y = 0.025;
      screenGroup.add(scrnPlane);

      // Glowing bezel border
      const bezelEdgeGeo = new THREE.EdgesGeometry(bezelGeo);
      const bezelEdgeMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
      const bezelEdge = new THREE.LineSegments(bezelEdgeGeo, bezelEdgeMat);
      screenGroup.add(bezelEdge);

      scene.add(screenGroup);

      // 3. CRAFTING CYBER TABLET (On the table right next to the embedded screen)
      const tabDist = tableRadius - 0.65;
      const tabAngle = angle + 0.24; // Offset to the right side of the monitor
      const tx = Math.cos(tabAngle) * tabDist;
      const tz = Math.sin(tabAngle) * tabDist;

      const tabletGroup = new THREE.Group();
      tabletGroup.position.set(tx, 1.185, tz);
      tabletGroup.rotation.y = rotY + 0.15; // Slightly angled

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

      const tabEdge = new THREE.LineSegments(
        new THREE.EdgesGeometry(tabBodyGeo),
        new THREE.LineBasicMaterial({ color: 0xc084fc })
      );
      tabletGroup.add(tabEdge);

      clickableTargets.push({ object: tabBody, type: "tablet" });
      scene.add(tabletGroup);
    }

    // C. ARCADE MACHINE IN THE SAME ROOM ("ARCADE BLACK MARKET")
    const arcadePos = { x: tableRadius + 3.8, y: 0, z: -1.8 };
    const arcadeMachineGroup = new THREE.Group();
    arcadeMachineGroup.position.set(arcadePos.x, 0, arcadePos.z);
    arcadeMachineGroup.rotation.y = -Math.PI / 2 - 0.35; // Angled facing the table

    // Cabinet Main Base
    const cabGeo = new THREE.BoxGeometry(1.8, 3.2, 1.3);
    const cabMat = new THREE.MeshStandardMaterial({ color: 0x120826, roughness: 0.3, metalness: 0.4 });
    const cab = new THREE.Mesh(cabGeo, cabMat);
    cab.position.y = 1.6;
    arcadeMachineGroup.add(cab);

    // Glowing Marquee Header ("BLACK MARKET ARCADE")
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

    // CRT Arcade Screen (Curved / Angled inset display)
    const arcScreenGeo = new THREE.PlaneGeometry(1.35, 1.05);
    const arcScreenMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
    const arcScreen = new THREE.Mesh(arcScreenGeo, arcScreenMat);
    arcScreen.position.set(0, 1.95, 0.66);
    arcScreen.rotation.x = -0.15;
    arcadeMachineGroup.add(arcScreen);

    // Arcade Control Deck (Angled with Dual Joysticks & Neon Buttons)
    const deckGeo = new THREE.BoxGeometry(1.65, 0.35, 0.75);
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.4 });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(0, 1.15, 0.5);
    deck.rotation.x = -0.4;
    arcadeMachineGroup.add(deck);

    // 2 Mini Joysticks
    const stickGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.18, 8);
    const stickMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8 });
    const stickL = new THREE.Mesh(stickGeo, stickMat);
    stickL.position.set(-0.35, 1.32, 0.52);
    arcadeMachineGroup.add(stickL);
    const stickR = new THREE.Mesh(stickGeo, stickMat);
    stickR.position.set(0.2, 1.32, 0.52);
    arcadeMachineGroup.add(stickR);

    // Cabinet Outline Neon Edges
    const cabEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(cabGeo),
      new THREE.LineBasicMaterial({ color: 0xf59e0b })
    );
    cabEdges.position.y = 1.6;
    arcadeMachineGroup.add(cabEdges);

    // Glow light from Arcade
    const arcLight = new THREE.PointLight(0xf59e0b, 3.5, 14);
    arcLight.position.set(0, 2.5, 1.2);
    arcadeMachineGroup.add(arcLight);

    clickableTargets.push({ object: cab, type: "arcade" });
    scene.add(arcadeMachineGroup);

    // D. GIANT HOLOGRAPHIC ROOM SCREEN (On the North Wall)
    const wallScreenGeo = new THREE.PlaneGeometry(16, 7.5);
    const wallScreenMat = new THREE.MeshBasicMaterial({ color: 0x021124, side: THREE.DoubleSide });
    const wallScreen = new THREE.Mesh(wallScreenGeo, wallScreenMat);
    wallScreen.position.set(0, 6.2, -18);
    scene.add(wallScreen);

    const wallScreenEdge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(16, 7.5, 0.1)),
      new THREE.LineBasicMaterial({ color: 0x00f0ff })
    );
    wallScreenEdge.position.set(0, 6.2, -18);
    scene.add(wallScreenEdge);

    // 7. INTERACTIVE WORLD SCRAP CUBES (3D Floating Resource Loot)
    const scrapMeshes: Record<string, THREE.Group> = {};
    const scraps = gameState.worldScraps || [];

    scraps.forEach((s) => {
      const group = new THREE.Group();
      group.position.set(s.x, 0.8, s.z);

      // Glowing resource cube
      const cubeGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
      const cubeMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 0.8,
        roughness: 0.1,
      });
      const cube = new THREE.Mesh(cubeGeo, cubeMat);
      group.add(cube);

      // Pulsing floor halo ring
      const haloGeo = new THREE.RingGeometry(0.6, 0.9, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = Math.PI / 2;
      halo.position.y = -0.45;
      group.add(halo);

      scene.add(group);
      scrapMeshes[s.id] = group;
    });

    // 8. 3D LASER TARGETING & POINTER SYSTEM
    const laserLineMat = new THREE.LineBasicMaterial({
      color: 0xef4444,
      linewidth: 3,
      transparent: true,
      opacity: 0.95,
    });
    const laserLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    const laserLine = new THREE.Line(laserLineGeo, laserLineMat);
    laserLine.visible = false;
    scene.add(laserLine);

    // Glowing impact dot at laser pointer tip
    const laserDotGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const laserDotMat = new THREE.MeshBasicMaterial({ color: 0xff1e1e });
    const laserDot = new THREE.Mesh(laserDotGeo, laserDotMat);
    laserDot.visible = false;
    scene.add(laserDot);

    let freeLaserTarget: { pos: THREE.Vector3; expiresAt: number } | null = null;

    // 9. TAP-TO-MOVE DESTINATION BEACON RING
    const beaconGeo = new THREE.RingGeometry(0.5, 0.8, 24);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.rotation.x = Math.PI / 2;
    beaconMesh.position.y = 0.36;
    scene.add(beaconMesh);

    // 10. 3D CHARACTERS POOL (Fall-Guys / Mecha-Chameleon models with 8 Cute Skins)
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
        isMe: boolean;
      }
    > = {};

    const buildCharacterModel = (player: MastermindPlayerInfo, isMe: boolean) => {
      const charGroup = new THREE.Group();
      const colorHex = player.color || "#0ea5e9";
      const skin = (player.skin as CharacterSkin) || (isMe ? currentSkin : "chameleon");

      // A. Cute Rounded Bean Body (Fall Guys / Mecha-Chameleon Style)
      const bodyGeo = new THREE.CapsuleGeometry(0.48, 0.75, 16, 16);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        roughness: 0.25,
        metalness: 0.15,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.9;
      charGroup.add(body);

      // B. Glossy Visor Faceplate
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

      // C. 8 Distinct Cute Skins Accessories
      let tailMesh: THREE.Mesh | undefined;
      let accessoryMesh: THREE.Mesh | undefined;

      if (skin === "chameleon") {
        // Curled mechanical chameleon tail on the back!
        const tailGeo = new THREE.TorusGeometry(0.28, 0.08, 8, 20, Math.PI * 1.6);
        const tailMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colorHex), roughness: 0.3 });
        tailMesh = new THREE.Mesh(tailGeo, tailMat);
        tailMesh.position.set(0, 0.7, -0.44);
        tailMesh.rotation.y = Math.PI / 2;
        charGroup.add(tailMesh);

        // Sensory head crest
        const crestGeo = new THREE.ConeGeometry(0.12, 0.42, 6);
        const crestMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const crest = new THREE.Mesh(crestGeo, crestMat);
        crest.position.set(0, 1.52, 0.1);
        crest.rotation.x = -Math.PI / 6;
        charGroup.add(crest);
      } else if (skin === "monarch") {
        // Floating holographic gold crown
        const crownGeo = new THREE.TorusGeometry(0.35, 0.06, 8, 16);
        const crownMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
        accessoryMesh = new THREE.Mesh(crownGeo, crownMat);
        accessoryMesh.position.set(0, 1.68, 0);
        accessoryMesh.rotation.x = Math.PI / 2;
        charGroup.add(accessoryMesh);
      } else if (skin === "mecha") {
        // Dual shoulder energy pods & antenna
        const packGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.45, 8);
        const packMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 });
        const packL = new THREE.Mesh(packGeo, packMat);
        packL.position.set(-0.38, 1.1, -0.2);
        charGroup.add(packL);
        const packR = new THREE.Mesh(packGeo, packMat);
        packR.position.set(0.38, 1.1, -0.2);
        charGroup.add(packR);

        const antGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6);
        const antMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const ant = new THREE.Mesh(antGeo, antMat);
        ant.position.set(0.2, 1.55, 0);
        charGroup.add(ant);
      } else if (skin === "neko") {
        // Cute cyber cat ears & tail
        const earGeo = new THREE.ConeGeometry(0.12, 0.32, 4);
        const earMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colorHex) });
        const earL = new THREE.Mesh(earGeo, earMat);
        earL.position.set(-0.25, 1.52, 0);
        charGroup.add(earL);
        const earR = new THREE.Mesh(earGeo, earMat);
        earR.position.set(0.25, 1.52, 0);
        charGroup.add(earR);
      } else if (skin === "dino") {
        // Cute baby dino tail & neon dorsal spikes
        const dinoTailGeo = new THREE.ConeGeometry(0.18, 0.5, 6);
        const dinoTailMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colorHex) });
        tailMesh = new THREE.Mesh(dinoTailGeo, dinoTailMat);
        tailMesh.position.set(0, 0.65, -0.5);
        tailMesh.rotation.x = -Math.PI / 3;
        charGroup.add(tailMesh);

        for (let s = 0; s < 3; s++) {
          const spikeGeo = new THREE.ConeGeometry(0.08, 0.18, 4);
          const spikeMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
          const spike = new THREE.Mesh(spikeGeo, spikeMat);
          spike.position.set(0, 1.4 - s * 0.28, -0.42);
          spike.rotation.x = -Math.PI / 4;
          charGroup.add(spike);
        }
      } else if (skin === "bunny") {
        // Tall mechanical rabbit ears
        const bunnyEarGeo = new THREE.CapsuleGeometry(0.08, 0.45, 8, 8);
        const bunnyEarMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colorHex) });
        const earL = new THREE.Mesh(bunnyEarGeo, bunnyEarMat);
        earL.position.set(-0.2, 1.7, 0);
        earL.rotation.z = 0.15;
        charGroup.add(earL);
        const earR = new THREE.Mesh(bunnyEarGeo, bunnyEarMat);
        earR.position.set(0.2, 1.7, 0);
        earR.rotation.z = -0.15;
        charGroup.add(earR);
      } else if (skin === "cosmo") {
        // Retro golden spherical helmet bubble & oxygen jetpack
        const domeGeo = new THREE.SphereGeometry(0.48, 16, 16);
        const domeMat = new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          roughness: 0.1,
          metalness: 0.9,
          transparent: true,
          opacity: 0.85,
        });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.position.set(0, 1.25, 0.05);
        charGroup.add(dome);

        const tankGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.55, 8);
        const tankMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
        const tank = new THREE.Mesh(tankGeo, tankMat);
        tank.position.set(0, 1.0, -0.45);
        charGroup.add(tank);
      } else if (skin === "shadow") {
        // Ninja cowl & crimson visor slit
        const cowlGeo = new THREE.TorusGeometry(0.42, 0.1, 8, 16);
        const cowlMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.8 });
        const cowl = new THREE.Mesh(cowlGeo, cowlMat);
        cowl.position.set(0, 1.35, 0);
        cowl.rotation.x = Math.PI / 2;
        charGroup.add(cowl);
      }

      // D. Floating Billboard Name Tag
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 70;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = isMe ? "rgba(0, 240, 255, 0.25)" : "rgba(4, 6, 13, 0.85)";
        ctx.roundRect(4, 4, 248, 62, 10);
        ctx.fill();
        ctx.strokeStyle = colorHex;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.font = "bold 24px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(`${player.avatar} ${player.name}${isMe ? " (YOU)" : ""}`, 128, 42);
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
        isMe,
      };
    };

    // Seat all players in their cyber chairs around the round table!
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

      if (isMe) {
        localPosRef.current = { x: px, z: pz, rotation: rot, isMoving: false };
      }
    });

    // 11. ACTIVE 3D PROJECTILES & SPLASH PARTICLES POOLS
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
      // bomb
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

    // 12. INTERACTIVE RAYCASTING (Clicking players, arcade machine, tablets, or pointing laser)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (e: MouseEvent | TouchEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check clickable special objects first (Arcade, Tablet, Players)
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

      // Check table top or floor to aim laser pointer for fun
      const floorIntersects = raycaster.intersectObjects([tableMesh, foundationMesh], false);
      if (floorIntersects.length > 0) {
        const pt = floorIntersects[0].point;
        freeLaserTarget = { pos: pt.clone(), expiresAt: performance.now() + 3000 };
      }
    };

    container.addEventListener("click", handleCanvasClick);

    // 13. MAIN ANIMATION & GAME LOOP
    let animId: number;
    let clock = new THREE.Clock();
    let lastNetworkSync = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();
      const now = performance.now();

      // Spin crystal in table center
      crystalMesh.rotation.y += 0.8 * dt;
      crystalMesh.rotation.x = Math.sin(elapsedTime * 1.5) * 0.2;
      marquee.material.emissiveIntensity = 0.5 + Math.sin(elapsedTime * 3) * 0.3;

      // Animate floating scrap cubes
      scraps.forEach((s) => {
        const m = scrapMeshes[s.id];
        if (m) {
          m.position.y = 0.8 + Math.sin(elapsedTime * 3 + s.x) * 0.15;
          m.rotation.y += 1.5 * dt;
          m.rotation.x += 0.8 * dt;
        }
      });

      // Animate tap beacon ring
      if (beaconMesh.material.opacity > 0) {
        beaconMesh.material.opacity -= 0.6 * dt;
        beaconMesh.scale.addScalar(0.8 * dt);
      }

      // Check Throw Queue and Spawn 3D Projectiles
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

      // Update 3D Projectiles
      for (let i = activeProjectiles.length - 1; i >= 0; i--) {
        const p = activeProjectiles[i];
        const progress = Math.min(1.0, (now - p.startTime) / p.duration);

        // Parabolic flight arc
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
          part.velocity.y -= 9.8 * dt; // gravity
        });

        if (spProg >= 1.0) {
          scene.remove(splash.group);
          activeSplashes.splice(sIdx, 1);
        }
      }

      // Update 3D Laser Pointer & Targeting Line
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

      // --- CAMERA POSITIONING BASED ON GAME PHASE ---
      if (phase === "round_table_meeting") {
        // High-angle cinematic view of the round table, all seated players, lasers & right-side abilities HUD
        const targetCamX = Math.sin(elapsedTime * 0.08) * 3.0;
        const targetCamZ = tableRadius + 5.2;
        camera.position.x += (targetCamX - camera.position.x) * 0.045;
        camera.position.y += (6.8 - camera.position.y) * 0.045;
        camera.position.z += (targetCamZ - camera.position.z) * 0.045;
        camera.lookAt(0, 1.25, 0);
      } else if (phase === "minigame") {
        // Seated viewpoint: camera frames the player's personal in-table embedded monitor with the round table in front!
        const mySeat = characterMeshes[myId]?.group.position;
        if (mySeat) {
          const camX = mySeat.x * 1.35;
          const camZ = mySeat.z * 1.35;
          camera.position.x += (camX - camera.position.x) * 0.06;
          camera.position.y += (2.6 - camera.position.y) * 0.06;
          camera.position.z += (camZ - camera.position.z) * 0.06;
          camera.lookAt(mySeat.x * 0.55, 1.18, mySeat.z * 0.55);
        } else {
          camera.position.set(0, 4.5, 6.5);
          camera.lookAt(0, 1.2, 0);
        }
      } else if (phase === "shop_and_craft" || phase === "shop") {
        // Seated view of the room framing both the round table, Arcade machine & tablets
        const camX = Math.sin(elapsedTime * 0.05) * 3.5;
        const camZ = tableRadius + 5.8;
        camera.position.x += (camX - camera.position.x) * 0.04;
        camera.position.y += (7.0 - camera.position.y) * 0.04;
        camera.position.z += (camZ - camera.position.z) * 0.04;
        camera.lookAt(0, 1.2, 0);
      } else if (phase === "role_reveal") {
        // Framing center of table crystal
        camera.position.x += (0 - camera.position.x) * 0.05;
        camera.position.y += (7.5 - camera.position.y) * 0.05;
        camera.position.z += (tableRadius + 4.8 - camera.position.z) * 0.05;
        camera.lookAt(0, 1.4, 0);
      } else {
        // Default overview
        camera.position.x += (Math.sin(elapsedTime * 0.05) * 2 - camera.position.x) * 0.05;
        camera.position.y += (7.2 - camera.position.y) * 0.05;
        camera.position.z += (tableRadius + 5.5 - camera.position.z) * 0.05;
        camera.lookAt(0, 1.2, 0);
      }

      // Local player seating
      const mySeat = characterMeshes[myId];
      if (mySeat) {
        mySeat.body.rotation.z = 0;
        mySeat.group.position.y = 0.35 + Math.sin(elapsedTime * 2.2) * 0.02;
        const blink = Math.sin(elapsedTime * 1.8) > 0.96 ? 0.1 : 1.0;
        mySeat.leftEye.scale.y = blink;
        mySeat.rightEye.scale.y = blink;
      }

      // Update Remote Players from gameState (all seated around table)
      playerList.forEach(([pid, p], idx) => {
        if (pid === myId) return;
        let model = characterMeshes[pid];
        if (!model) {
          model = buildCharacterModel(p, false);
          characterMeshes[pid] = model;
          clickableTargets.push({ object: model.group, type: "player", id: pid });
        }

        const seat = chairPositions[idx % chairPositions.length];
        if (seat) {
          model.group.position.set(seat.x, 0.35, seat.z);
          model.group.rotation.y = seat.rotation;
        }

        // Cute avatar breathing & head turn
        model.body.rotation.z = Math.sin(elapsedTime * 2.0 + idx) * 0.04;
        model.group.position.y = 0.35 + Math.sin(elapsedTime * 2.5 + idx) * 0.02;
      });

      // Check Proximity to Points of Interest in the Room
      const canMoveFreely = false;
      const distToArcade = Math.hypot(localPosRef.current.x - (tableRadius + 3.8), localPosRef.current.z - (-1.8));
      const distToCenterTable = Math.hypot(localPosRef.current.x, localPosRef.current.z);

      if (distToArcade < 5.0) {
        setNearbyInteractable({ type: "arcade", label: "🕹️ Arcade Black Market" });
      } else if (distToCenterTable < tableRadius + 2.0) {
        setNearbyInteractable({ type: "tablet", label: "📱 In-Table Crafting Tablet" });
      } else {
        setNearbyInteractable({ type: "table", label: "Council Round Table" });
      }

      const foundSecName = "Council Chamber (Round Table Core)";
      setCurrentSectorName(foundSecName);

      // Network Sync (Throttle to 50ms)
      const curNow = performance.now();
      if (curNow - lastNetworkSync > 50 && onMovePlayer) {
        onMovePlayer(
          Math.round(localPosRef.current.x * 100) / 100,
          Math.round(localPosRef.current.z * 100) / 100,
          Math.round(localPosRef.current.rotation * 100) / 100,
          false,
          currentSkin,
          foundSecName
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
      container.removeEventListener("click", handleCanvasClick);
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [gameState.worldScraps, myId, currentSkin, phase, selectedTargetId, onMovePlayer, onCollectScrap]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950 text-white font-sans">
      {/* 1. 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-pointer touch-none" />

      {/* 2. PERSISTENT MINIMAP (Top-Right) — EXACT BLUEPRINT REPLICA */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1 pointer-events-none">
        <div
          className={`${
            minimapExpanded ? "w-72 h-72 md:w-84 md:h-84" : "w-36 h-36 md:w-44 md:h-44"
          } rounded-2xl bg-slate-950/95 border-2 border-cyan-500/60 backdrop-blur-md shadow-2xl p-2 relative overflow-hidden pointer-events-auto transition-all duration-300`}
        >
          {/* Minimap SVG Radar */}
          <svg viewBox="-40 -40 80 80" className="w-full h-full">
            {/* Outer Perimeter Grid */}
            <rect x="-38" y="-38" width="76" height="76" fill="#030712" stroke="#1e293b" strokeWidth="0.8" />

            {/* Central Square Wall framing the Ring (From Image 2 Blueprint) */}
            <rect x="-13" y="-13" width="26" height="26" fill="none" stroke="#0284c7" strokeWidth="1" strokeDasharray="2,2" />

            {/* Concentric Ring Corridor (Image 1 & 2) */}
            <circle cx="0" cy="0" r="11" fill="none" stroke="#0ea5e9" strokeWidth="2.5" opacity="0.4" />

            {/* Central Lockdown Room (Dome) */}
            <circle cx="0" cy="0" r="7" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.2" opacity="0.75" />
            <text x="0" y="1" fontSize="2.8" fill="#ffffff" textAnchor="middle" fontWeight="bold">
              LOCKDOWN
            </text>

            {/* 4 Cardinal Vaults (V1, V2, V3, V4) */}
            {/* V1 - West */}
            <circle cx="-11" cy="0" r="3" fill="#1e1b4b" stroke="#f43f5e" strokeWidth="1" />
            <text x="-11" y="1" fontSize="2.5" fill="#f43f5e" textAnchor="middle" fontWeight="bold">V1</text>
            {/* Red Blast Door for V1 */}
            <line x1="-14" y1="-2" x2="-14" y2="2" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />

            {/* V2 - North */}
            <circle cx="0" cy="-11" r="3" fill="#1e1b4b" stroke="#f43f5e" strokeWidth="1" />
            <text x="0" y="-10" fontSize="2.5" fill="#f43f5e" textAnchor="middle" fontWeight="bold">V2</text>
            {/* Red Blast Door for V2 */}
            <line x1="-2" y1="-14" x2="2" y2="-14" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />

            {/* V3 - East */}
            <circle cx="11" cy="0" r="3" fill="#1e1b4b" stroke="#f43f5e" strokeWidth="1" />
            <text x="11" y="1" fontSize="2.5" fill="#f43f5e" textAnchor="middle" fontWeight="bold">V3</text>
            {/* Red Blast Door for V3 */}
            <line x1="14" y1="-2" x2="14" y2="2" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />

            {/* V4 - South */}
            <circle cx="0" cy="11" r="3" fill="#1e1b4b" stroke="#f43f5e" strokeWidth="1" />
            <text x="0" y="12" fontSize="2.5" fill="#f43f5e" textAnchor="middle" fontWeight="bold">V4</text>
            {/* Red Blast Door for V4 */}
            <line x1="-2" y1="14" x2="2" y2="14" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />

            {/* Axial Corridors */}
            <rect x="-2" y="-28" width="4" height="14" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.6" opacity="0.6" />
            <rect x="-2" y="14" width="4" height="14" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.6" opacity="0.6" />
            <rect x="-28" y="-2" width="14" height="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.6" opacity="0.6" />
            <rect x="14" y="-2" width="14" height="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.6" opacity="0.6" />

            {/* Top Horizontal Corridor & Far Corridors */}
            <rect x="-2" y="-29" width="34" height="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.5" opacity="0.5" />
            <rect x="-35" y="-19" width="3" height="34" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.5" opacity="0.5" />
            <rect x="32" y="-15" width="3" height="34" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.5" opacity="0.5" />

            {/* Northwest Circular Room (Doctor's Bio Clinic) */}
            <circle cx="-24" cy="-18" r="6" fill="#064e3b" stroke="#10b981" strokeWidth="1" opacity="0.8" />
            <text x="-24" y="-17" fontSize="2.4" fill="#10b981" textAnchor="middle" fontWeight="bold">CLINIC</text>

            {/* Southeast Circular Chamber (Gas Decon) */}
            <circle cx="24" cy="18" r="6" fill="#713f12" stroke="#eab308" strokeWidth="1" opacity="0.8" />
            <text x="24" y="19" fontSize="2.4" fill="#eab308" textAnchor="middle" fontWeight="bold">CHAMBER</text>

            {/* Surrounding Research Rooms */}
            <rect x="6" y="-26" width="10" height="9" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />
            <polygon points="19,-26 25,-26 27,-21 25,-16 19,-16" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />
            <rect x="16" y="-14" width="14" height="9" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />
            <rect x="16" y="5" width="14" height="9" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />
            <rect x="4" y="16" width="11" height="8" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />
            <polygon points="-33,8 -27,4 -22,8 -24,15 -31,15" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />
            <rect x="-24" y="5" width="8" height="9" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />
            <rect x="-26" y="16" width="9" height="8" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />
            <rect x="-16" y="16" width="10" height="11" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />
            <rect x="-31" y="-12" width="12" height="8" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />
            <rect x="-16" y="-26" width="11" height="10" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />
            <rect x="-26" y="-5" width="10" height="7" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />

            {/* Grey Doorway Entrances on walls */}
            <rect x="-11" y="-2" width="1.2" height="1.8" fill="#94a3b8" />
            <rect x="9.8" y="-2" width="1.2" height="1.8" fill="#94a3b8" />
            <rect x="-1" y="-11" width="1.8" height="1.2" fill="#94a3b8" />
            <rect x="-1" y="9.8" width="1.8" height="1.2" fill="#94a3b8" />
            <rect x="-18" y="-18" width="1.2" height="1.8" fill="#94a3b8" />
            <rect x="30" y="18" width="1.2" height="1.8" fill="#94a3b8" />

            {/* Floating World Scrap Blips */}
            {gameState.worldScraps?.map((s) => (
              <circle key={s.id} cx={s.x} cy={s.z} r="1.1" fill="#facc15" className="animate-pulse" />
            ))}

            {/* Other Operatives Blips */}
            {Object.entries(gameState.players).map(([pid, p]) => {
              if (pid === myId) return null;
              return (
                <circle
                  key={pid}
                  cx={p.x ?? 0}
                  cy={p.z ?? 0}
                  r="2.2"
                  fill={p.color || "#e2e8f0"}
                  stroke="#ffffff"
                  strokeWidth="0.5"
                />
              );
            })}

            {/* Local Player Icon (Pulsing Triangle + Radar Cone) */}
            <g
              transform={`translate(${localPosRef.current.x}, ${localPosRef.current.z}) rotate(${
                (localPosRef.current.rotation * 180) / Math.PI
              })`}
            >
              <polygon points="0,0 -4,10 4,10" fill="url(#radarCone)" opacity="0.4" />
              <polygon points="0,3 2.5,-3 -2.5,-3" fill="#00f0ff" stroke="#ffffff" strokeWidth="0.6" />
              <circle cx="0" cy="0" r="3.8" fill="none" stroke="#00f0ff" strokeWidth="0.8" opacity="0.7" />
            </g>

            <defs>
              <linearGradient id="radarCone" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Minimap Expand/Collapse Button */}
          <button
            onClick={() => setMinimapExpanded((o) => !o)}
            className="absolute bottom-1 right-1 p-1 rounded-lg bg-slate-900/90 text-cyan-400 hover:text-white border border-cyan-500/40"
          >
            {minimapExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Current Room / Sector Tag */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-[11px] font-mono text-cyan-300 backdrop-blur-md">
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold truncate max-w-[160px]">{currentSectorName}</span>
        </div>
      </div>

      {/* 3. TOP-LEFT HUD: Operative Profile & Skins Button */}
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

        {/* Skins Selector Button */}
        <button
          onClick={() => setSkinDrawerOpen((o) => !o)}
          className="px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 text-xs font-black text-cyan-300 hover:text-white flex items-center gap-1.5 shadow-lg backdrop-blur-md active:scale-95 transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Skins</span>
        </button>
      </div>

      {/* 4. FLOATING PROXIMITY INTERACTION PROMPT */}
      {nearbyInteractable && phase !== "round_table_meeting" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-16 z-30 flex flex-col items-center gap-1 animate-bounce pointer-events-auto">
          <button
            onClick={() => onInteract && onInteract(nearbyInteractable.type, nearbyInteractable.id)}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-2xl flex items-center gap-2 border border-white/50"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>{nearbyInteractable.label} (Press E or Tap)</span>
          </button>
        </div>
      )}

      {/* 5. VIRTUAL JOYSTICK (Bottom-Left - Mobile Movement in free-roam) */}
      {phase !== "round_table_meeting" && !hideDefaultHud && (
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
            {/* Center Joystick Knob */}
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

      {/* 6. BOTTOM-RIGHT ACTION HOTBAR */}
      {!hideDefaultHud && (
        <div className="absolute bottom-6 right-6 z-30 flex items-end gap-2.5">
          {/* Shop / Procurement Button */}
          {onOpenShop && (
            <button
              onClick={onOpenShop}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 border border-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 active:scale-95 transition"
              title="Black Market & Crafting Bench"
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

          {/* Big Mobile Action / Interact Button */}
          {phase !== "round_table_meeting" && (
            <button
              onClick={() => {
                if (nearbyInteractable && onInteract) {
                  onInteract(nearbyInteractable.type, nearbyInteractable.id);
                }
              }}
              className={`w-14 h-14 rounded-2xl border flex items-center justify-center text-slate-950 font-black shadow-xl active:scale-95 transition ${
                nearbyInteractable
                  ? "bg-gradient-to-r from-amber-400 to-yellow-400 border-white shadow-amber-500/50 animate-pulse"
                  : "bg-slate-800/80 border-slate-700 text-slate-500 opacity-60"
              }`}
              title="Action / Interact"
            >
              <Zap className="w-7 h-7 fill-current" />
            </button>
          )}
        </div>
      )}

      {/* 7. SKINS SELECTION DRAWER */}
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
