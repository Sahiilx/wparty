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
  onInteract?: (type: "table" | "craft" | "terminal" | "scrap", entityId?: string) => void;
  onTriggerEmote?: (emote: string) => void;
  onThrowItem?: (item: "tomato" | "balloon" | "popper" | "duck" | "bomb", targetId?: string) => void;
  onOpenShop?: () => void;
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
    type: "table" | "craft" | "terminal" | "scrap";
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

    // 5. CENTRAL 3D ROUND TABLE & SEATS (In Lockdown Room Dome)
    const tableRadius = 3.8;
    const tableGeo = new THREE.CylinderGeometry(tableRadius, tableRadius, 0.4, 40);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x0b1329,
      roughness: 0.2,
      metalness: 0.8,
    });
    const tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.position.set(0, 1.0, 0);
    scene.add(tableMesh);

    const tableEdgeGeo = new THREE.TorusGeometry(tableRadius, 0.08, 8, 40);
    const tableEdgeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const tableEdge = new THREE.Mesh(tableEdgeGeo, tableEdgeMat);
    tableEdge.rotation.x = Math.PI / 2;
    tableEdge.position.set(0, 1.2, 0);
    scene.add(tableEdge);

    // Center spinning holographic crystal (The Panacea Data Matrix)
    const crystalGeo = new THREE.OctahedronGeometry(0.55, 0);
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    crystalMesh.position.set(0, 1.9, 0);
    scene.add(crystalMesh);

    // Chairs around the council table (8 ergonomic cyber chairs)
    const chairCount = 8;
    const chairPositions: Array<{ x: number; z: number; rotation: number }> = [];
    for (let i = 0; i < chairCount; i++) {
      const angle = (i * 2 * Math.PI) / chairCount;
      const cx = Math.cos(angle) * 5.2;
      const cz = Math.sin(angle) * 5.2;
      const rotY = -angle + Math.PI / 2;
      chairPositions.push({ x: cx, z: cz, rotation: rotY });

      const chairGroup = new THREE.Group();
      chairGroup.position.set(cx, 0.35, cz);
      chairGroup.rotation.y = rotY;

      const seatGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.12, 16);
      const seatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
      const seat = new THREE.Mesh(seatGeo, seatMat);
      seat.position.y = 0.5;
      chairGroup.add(seat);

      const backGeo = new THREE.BoxGeometry(0.65, 0.6, 0.1);
      const back = new THREE.Mesh(backGeo, seatMat);
      back.position.set(0, 0.85, -0.35);
      chairGroup.add(back);

      scene.add(chairGroup);
    }

    // 6. 3D CRAFTING BENCH & BLACK MARKET DEPOT
    const craftBenchGroup = new THREE.Group();
    craftBenchGroup.position.set(16, 0.35, -16);
    const benchGeo = new THREE.BoxGeometry(3.5, 1.0, 1.8);
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.3 });
    const benchMesh = new THREE.Mesh(benchGeo, benchMat);
    benchMesh.position.y = 0.5;
    craftBenchGroup.add(benchMesh);

    // Floating wrench & gear hologram
    const craftHoloGeo = new THREE.TorusGeometry(0.45, 0.08, 8, 20);
    const craftHoloMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true });
    const craftHolo = new THREE.Mesh(craftHoloGeo, craftHoloMat);
    craftHolo.position.y = 1.6;
    craftBenchGroup.add(craftHolo);
    scene.add(craftBenchGroup);

    // Black Market Depot Terminal (In East Wing)
    const marketTerminalGroup = new THREE.Group();
    marketTerminalGroup.position.set(22, 0.35, -4);
    const termGeo = new THREE.BoxGeometry(2.0, 2.2, 1.2);
    const termMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.2 });
    const termMesh = new THREE.Mesh(termGeo, termMat);
    termMesh.position.y = 1.1;
    marketTerminalGroup.add(termMesh);

    const screenGeo = new THREE.PlaneGeometry(1.6, 0.9);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 1.5, 0.62);
    marketTerminalGroup.add(screenMesh);
    scene.add(marketTerminalGroup);

    // =========================================================================
    // 6b. PHASE-SPECIFIC 3D ENVIRONMENT PROPS
    // =========================================================================
    const phaseAnimated: Array<{ mesh: THREE.Object3D; anim: string; baseY?: number }> = [];
    const playerCount = Object.keys(gameState.players).length || 4;

    if (phase === "round_table_meeting") {
      // === HOLOGRAPHIC MEETING SCREEN (north of round table) ===
      const screenW = 9.5, screenH = 5.8;

      const screenFrameGeo = new THREE.BoxGeometry(screenW + 0.5, screenH + 0.5, 0.35);
      const screenFrameMat = new THREE.MeshStandardMaterial({ color: 0x0a1628, roughness: 0.3, metalness: 0.9 });
      const screenFrame = new THREE.Mesh(screenFrameGeo, screenFrameMat);
      screenFrame.position.set(0, 5.2, -8.2);
      scene.add(screenFrame);

      const screenPlaneGeo = new THREE.PlaneGeometry(screenW - 0.1, screenH - 0.1);
      const screenPlaneMat = new THREE.MeshBasicMaterial({ color: 0x001a3a, side: THREE.DoubleSide });
      const screenPlane = new THREE.Mesh(screenPlaneGeo, screenPlaneMat);
      screenPlane.position.set(0, 5.2, -8.0);
      scene.add(screenPlane);

      // Neon glowing frame edges
      const glowFrameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(screenW, screenH, 0.05));
      const glowFrameMat = new THREE.LineBasicMaterial({ color: 0x00f0ff });
      const glowFrame = new THREE.LineSegments(glowFrameGeo, glowFrameMat);
      glowFrame.position.set(0, 5.2, -7.95);
      scene.add(glowFrame);

      // Animated scan line across screen
      const scanGeo = new THREE.PlaneGeometry(screenW - 0.3, 0.14);
      const scanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
      const scanLine = new THREE.Mesh(scanGeo, scanMat);
      scanLine.position.set(0, 5.2, -7.95);
      scene.add(scanLine);
      phaseAnimated.push({ mesh: scanLine, anim: "scan", baseY: 5.2 });

      // Holographic projector column rising from table center
      const projColGeo = new THREE.CylinderGeometry(0.05, 0.35, 4.0, 12, 1, true);
      const projColMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
      const projCol = new THREE.Mesh(projColGeo, projColMat);
      projCol.position.set(0, 3.2, -1.5);
      scene.add(projCol);
      phaseAnimated.push({ mesh: projCol, anim: "pulse_opacity" });

      // Tablets on table surface at each chair
      chairPositions.forEach((cp) => {
        const angleToCenter = Math.atan2(0 - cp.z, 0 - cp.x);
        const tX = cp.x * 0.5 + Math.cos(angleToCenter) * 1.6;
        const tZ = cp.z * 0.5 + Math.sin(angleToCenter) * 1.6;

        const tabletGeo = new THREE.BoxGeometry(0.52, 0.055, 0.37);
        const tabletMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
        const tablet = new THREE.Mesh(tabletGeo, tabletMat);
        tablet.position.set(tX, 1.22, tZ);
        tablet.rotation.y = cp.rotation;

        const tabScreenGeo = new THREE.PlaneGeometry(0.44, 0.3);
        const tabScreenMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
        const tabScreen = new THREE.Mesh(tabScreenGeo, tabScreenMat);
        tabScreen.rotation.x = -Math.PI / 2;
        tabScreen.position.set(0, 0.03, 0);
        tablet.add(tabScreen);
        phaseAnimated.push({ mesh: tabScreen, anim: "screen_flicker" });

        const tabEdgeGeo = new THREE.EdgesGeometry(tabletGeo);
        const tabEdgeMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
        const tabEdge = new THREE.LineSegments(tabEdgeGeo, tabEdgeMat);
        tablet.add(tabEdge);
        scene.add(tablet);
      });

      // Atmospheric meeting lights
      const meetingLight1 = new THREE.PointLight(0x7c3aed, 5.0, 60);
      meetingLight1.position.set(0, 7, -6);
      scene.add(meetingLight1);
      const meetingLight2 = new THREE.PointLight(0x00f0ff, 3.5, 40);
      meetingLight2.position.set(0, 5, -7.5);
      scene.add(meetingLight2);

    } else if (phase === "minigame") {
      // === ARCADE TERMINAL PODS (players stand at each one) ===
      const termCount = Math.max(3, Math.min(playerCount, 6));
      const termRadius = 10;

      for (let i = 0; i < termCount; i++) {
        const angle = (i / termCount) * Math.PI * 2;
        const tx = Math.cos(angle) * termRadius;
        const tz = Math.sin(angle) * termRadius;

        const podGroup = new THREE.Group();
        podGroup.position.set(tx, 0, tz);
        podGroup.rotation.y = angle + Math.PI; // face center

        // Pod desk base
        const deskGeo = new THREE.BoxGeometry(1.65, 0.95, 0.9);
        const deskMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
        const desk = new THREE.Mesh(deskGeo, deskMat);
        desk.position.y = 0.47;
        podGroup.add(desk);

        // Monitor screen (angled up toward player)
        const monitorGeo = new THREE.BoxGeometry(1.35, 0.9, 0.1);
        const monitorMat = new THREE.MeshStandardMaterial({ color: 0x0a1628, roughness: 0.1, metalness: 0.9 });
        const monitor = new THREE.Mesh(monitorGeo, monitorMat);
        monitor.position.set(0, 1.44, -0.2);
        monitor.rotation.x = -0.3;
        podGroup.add(monitor);

        // Glowing display surface
        const dispGeo = new THREE.PlaneGeometry(1.2, 0.76);
        const dispMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
        const disp = new THREE.Mesh(dispGeo, dispMat);
        disp.position.set(0, 1.44, -0.15);
        disp.rotation.x = -0.3;
        podGroup.add(disp);
        phaseAnimated.push({ mesh: disp, anim: "screen_flicker" });

        // Keyboard/control panel
        const keyGeo = new THREE.BoxGeometry(1.2, 0.07, 0.6);
        const keyMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.5 });
        const keyPanel = new THREE.Mesh(keyGeo, keyMat);
        keyPanel.position.set(0, 0.96, 0.2);
        podGroup.add(keyPanel);

        // Neon pod edge
        const podEdgeGeo = new THREE.EdgesGeometry(deskGeo);
        const podEdgeMat = new THREE.LineBasicMaterial({ color: 0x00f0ff });
        const podEdge = new THREE.LineSegments(podEdgeGeo, podEdgeMat);
        podEdge.position.y = 0.47;
        podGroup.add(podEdge);

        // Per-pod glow
        const podLight = new THREE.PointLight(0x00f0ff, 1.8, 10);
        podLight.position.set(0, 2, -0.5);
        podGroup.add(podLight);

        scene.add(podGroup);
      }

      // Big overhead display screen (north wall)
      const bigFrameGeo = new THREE.BoxGeometry(14, 7, 0.4);
      const bigFrameMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.3 });
      const bigFrame = new THREE.Mesh(bigFrameGeo, bigFrameMat);
      bigFrame.position.set(0, 6, -21);
      scene.add(bigFrame);

      const bigScreenGeo = new THREE.PlaneGeometry(13.5, 6.5);
      const bigScreenMat = new THREE.MeshBasicMaterial({ color: 0x000d1a, side: THREE.DoubleSide });
      const bigScreen = new THREE.Mesh(bigScreenGeo, bigScreenMat);
      bigScreen.position.set(0, 6, -20.78);
      scene.add(bigScreen);

      const bigEdgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(14, 7, 0.1));
      const bigEdgeMat = new THREE.LineBasicMaterial({ color: 0xef4444 });
      const bigEdge = new THREE.LineSegments(bigEdgeGeo, bigEdgeMat);
      bigEdge.position.set(0, 6, -20.78);
      scene.add(bigEdge);

      // Overhead arcade lighting
      const arcLight1 = new THREE.PointLight(0xef4444, 3.5, 70);
      arcLight1.position.set(0, 7, -15);
      scene.add(arcLight1);
      const arcLight2 = new THREE.PointLight(0x00f0ff, 2.5, 55);
      arcLight2.position.set(0, 7, 0);
      scene.add(arcLight2);

    } else if (phase === "shop_and_craft" || phase === "shop") {
      // === PHYSICAL ARCADE SHOP ENVIRONMENT ===

      // 5 Arcade cabinets (west-north wall)
      const arcadeColors = [0x00f0ff, 0xf59e0b, 0xa855f7, 0x10b981, 0xef4444];
      for (let i = 0; i < 5; i++) {
        const arcadeGroup = new THREE.Group();
        arcadeGroup.position.set(-19 + i * 5.8, 0, -19);

        // Cabinet body
        const cabGeo = new THREE.BoxGeometry(1.75, 2.7, 1.1);
        const cabMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.3, metalness: 0.3 });
        const cab = new THREE.Mesh(cabGeo, cabMat);
        cab.position.y = 1.35;
        arcadeGroup.add(cab);

        // Marquee top (lit header)
        const marqueeGeo = new THREE.BoxGeometry(1.8, 0.55, 1.15);
        const marqueeMat = new THREE.MeshStandardMaterial({
          color: arcadeColors[i], roughness: 0.3,
          emissive: new THREE.Color(arcadeColors[i]), emissiveIntensity: 0.4
        });
        const marquee = new THREE.Mesh(marqueeGeo, marqueeMat);
        marquee.position.y = 2.98;
        arcadeGroup.add(marquee);
        phaseAnimated.push({ mesh: marquee, anim: "pulse_emissive_col" });

        // Screen display
        const aScrnGeo = new THREE.PlaneGeometry(1.25, 0.9);
        const aScrnMat = new THREE.MeshBasicMaterial({ color: arcadeColors[i], side: THREE.DoubleSide });
        const aScrn = new THREE.Mesh(aScrnGeo, aScrnMat);
        aScrn.position.set(0, 1.65, 0.57);
        arcadeGroup.add(aScrn);
        phaseAnimated.push({ mesh: aScrn, anim: "screen_flicker" });

        // Control panel
        const panelGeo = new THREE.BoxGeometry(1.55, 0.3, 0.65);
        const panelMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.5 });
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.set(0, 0.95, 0.4);
        panel.rotation.x = -0.5;
        arcadeGroup.add(panel);

        // Neon edge outline
        const cabEdgeGeo = new THREE.EdgesGeometry(cabGeo);
        const cabEdgeMat = new THREE.LineBasicMaterial({ color: arcadeColors[i] });
        const cabEdge = new THREE.LineSegments(cabEdgeGeo, cabEdgeMat);
        cabEdge.position.y = 1.35;
        arcadeGroup.add(cabEdge);

        // Per-cabinet glow
        const arcLight = new THREE.PointLight(arcadeColors[i], 2.0, 10);
        arcLight.position.set(0, 2.5, 1);
        arcadeGroup.add(arcLight);

        scene.add(arcadeGroup);
      }

      // Shop counter / bar (east side)
      const counterGrp = new THREE.Group();
      counterGrp.position.set(16, 0, -8);

      const counterGeo = new THREE.BoxGeometry(10, 1.1, 2.0);
      const counterMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.5 });
      const counter = new THREE.Mesh(counterGeo, counterMat);
      counter.position.y = 0.55;
      counterGrp.add(counter);

      const counterTopGeo = new THREE.BoxGeometry(10.1, 0.08, 2.1);
      const counterTopMat = new THREE.MeshStandardMaterial({ color: 0x0e2a3f, roughness: 0.1, metalness: 0.95 });
      const counterTop = new THREE.Mesh(counterTopGeo, counterTopMat);
      counterTop.position.y = 1.14;
      counterGrp.add(counterTop);

      const cEdgeGeo = new THREE.EdgesGeometry(counterGeo);
      const cEdgeMat = new THREE.LineBasicMaterial({ color: 0xf59e0b });
      const cEdge = new THREE.LineSegments(cEdgeGeo, cEdgeMat);
      cEdge.position.y = 0.55;
      counterGrp.add(cEdge);

      // Shopkeeper screen behind counter
      const keeperScrnGeo = new THREE.PlaneGeometry(3.8, 2.6);
      const keeperScrnMat = new THREE.MeshBasicMaterial({ color: 0x002211, side: THREE.DoubleSide });
      const keeperScrn = new THREE.Mesh(keeperScrnGeo, keeperScrnMat);
      keeperScrn.position.set(0, 2.6, -1.3);
      counterGrp.add(keeperScrn);
      phaseAnimated.push({ mesh: keeperScrn, anim: "screen_flicker" });

      const keeperEdgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(3.8, 2.6, 0.05));
      const keeperEdgeMat = new THREE.LineBasicMaterial({ color: 0x10b981 });
      const keeperEdge = new THREE.LineSegments(keeperEdgeGeo, keeperEdgeMat);
      keeperEdge.position.set(0, 2.6, -1.3);
      counterGrp.add(keeperEdge);
      scene.add(counterGrp);

      // Item display pedestals with floating glowing orbs
      const pedData: Array<{ pos: [number, number]; color: number }> = [
        { pos: [10, -13], color: 0x00f0ff },
        { pos: [15, -13], color: 0xf59e0b },
        { pos: [20, -13], color: 0xa855f7 },
      ];
      pedData.forEach(({ pos, color }) => {
        const [px, pz] = pos;
        const pedGeo = new THREE.CylinderGeometry(0.5, 0.65, 1.1, 12);
        const pedMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.3 });
        const ped = new THREE.Mesh(pedGeo, pedMat);
        ped.position.set(px, 0.55, pz);
        const pEdgeGeo = new THREE.EdgesGeometry(pedGeo);
        const pEdgeMat = new THREE.LineBasicMaterial({ color });
        ped.add(new THREE.LineSegments(pEdgeGeo, pEdgeMat));
        scene.add(ped);

        // Floating solid orb
        const orbGeo = new THREE.SphereGeometry(0.36, 16, 16);
        const orbMat = new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 0.5, roughness: 0.1 });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.set(px, 1.85, pz);
        scene.add(orb);
        phaseAnimated.push({ mesh: orb, anim: "float_spin", baseY: 1.85 });

        // Wireframe outer shell
        const orbWireGeo = new THREE.SphereGeometry(0.46, 10, 10);
        const orbWireMat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.5 });
        const orbWire = new THREE.Mesh(orbWireGeo, orbWireMat);
        orbWire.position.set(px, 1.85, pz);
        scene.add(orbWire);
        phaseAnimated.push({ mesh: orbWire, anim: "float_spin_inv", baseY: 1.85 });

        const orbLight = new THREE.PointLight(color, 2.5, 8);
        orbLight.position.set(px, 2.1, pz);
        scene.add(orbLight);
      });

      // Large crafting station (center-south)
      const craftStGrp = new THREE.Group();
      craftStGrp.position.set(-6, 0, 10);

      const cStGeo = new THREE.BoxGeometry(5.2, 1.25, 2.9);
      const cStMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2e, roughness: 0.3, metalness: 0.4 });
      const cSt = new THREE.Mesh(cStGeo, cStMat);
      cSt.position.y = 0.625;
      craftStGrp.add(cSt);

      const cStEdge = new THREE.LineSegments(
        new THREE.EdgesGeometry(cStGeo),
        new THREE.LineBasicMaterial({ color: 0xa855f7 })
      );
      cStEdge.position.y = 0.625;
      craftStGrp.add(cStEdge);

      // Holographic blueprint floating above
      const bpGeo = new THREE.PlaneGeometry(4.2, 2.6);
      const bpMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
      const bp = new THREE.Mesh(bpGeo, bpMat);
      bp.position.set(0, 2.7, 0);
      bp.rotation.x = -0.3;
      craftStGrp.add(bp);
      phaseAnimated.push({ mesh: bp, anim: "float_tilt", baseY: 2.7 });

      // Floating wrench
      const wrenchGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.85, 8);
      const wrenchMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.8 });
      const wrench = new THREE.Mesh(wrenchGeo, wrenchMat);
      wrench.position.set(-0.9, 1.95, 0);
      wrench.rotation.z = 0.5;
      craftStGrp.add(wrench);
      phaseAnimated.push({ mesh: wrench, anim: "float_slow", baseY: 1.95 });

      // Spinning gear
      const gearGeo = new THREE.TorusGeometry(0.32, 0.075, 6, 12);
      const gearMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.7 });
      const gear = new THREE.Mesh(gearGeo, gearMat);
      gear.position.set(0.9, 1.95, 0);
      craftStGrp.add(gear);
      phaseAnimated.push({ mesh: gear, anim: "spin_gear" });

      const craftGlow = new THREE.PointLight(0xa855f7, 4.0, 18);
      craftGlow.position.set(0, 3.5, 0);
      craftStGrp.add(craftGlow);
      scene.add(craftStGrp);

      // Shop ambient lighting
      const shopAmber = new THREE.PointLight(0xf59e0b, 3.5, 70);
      shopAmber.position.set(16, 7, -8);
      scene.add(shopAmber);
      const shopNeon = new THREE.PointLight(0x00f0ff, 2.0, 55);
      shopNeon.position.set(-10, 6, -16);
      scene.add(shopNeon);

    } else if (phase === "news_gazette" || phase === "morning_news") {
      // === NEWS PROJECTION THEATER ===

      // Massive projection screen (north wall)
      const wsGeo = new THREE.PlaneGeometry(23, 11.5);
      const wsMat = new THREE.MeshBasicMaterial({ color: 0x000d1a, side: THREE.DoubleSide });
      const wallScreen = new THREE.Mesh(wsGeo, wsMat);
      wallScreen.position.set(0, 7.8, -25);
      scene.add(wallScreen);

      const wsEdgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(23, 11.5, 0.1));
      const wsEdgeMat = new THREE.LineBasicMaterial({ color: 0xf43f5e });
      const wsEdge = new THREE.LineSegments(wsEdgeGeo, wsEdgeMat);
      wsEdge.position.set(0, 7.8, -25);
      scene.add(wsEdge);

      // Screen scanlines
      const newsScangeo = new THREE.PlaneGeometry(22.5, 0.15);
      const newsScanMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
      const newsScan = new THREE.Mesh(newsScangeo, newsScanMat);
      newsScan.position.set(0, 7.8, -24.95);
      scene.add(newsScan);
      phaseAnimated.push({ mesh: newsScan, anim: "scan", baseY: 7.8 });

      // Projector box (ceiling)
      const projBoxGeo = new THREE.BoxGeometry(0.75, 0.38, 1.1);
      const projBoxMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.5 });
      const projBox = new THREE.Mesh(projBoxGeo, projBoxMat);
      projBox.position.set(0, 11.5, -6);
      scene.add(projBox);

      // Projector lens glow
      const lensGeo = new THREE.SphereGeometry(0.15, 8, 8);
      const lensMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.position.set(0, 11.5, -6.65);
      scene.add(lens);

      // Light beam (cone from projector to screen)
      const beamGeo = new THREE.ConeGeometry(2.0, 20, 16, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.025, side: THREE.DoubleSide });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(0, 7.8, -15.5);
      beam.rotation.x = Math.PI / 2;
      scene.add(beam);
      phaseAnimated.push({ mesh: beam, anim: "pulse_opacity" });

      // Theater-style row seating (characters face north/screen)
      const seatRows = [
        { z: -4, count: 4 },
        { z: 2,  count: 4 },
        { z: 8,  count: 3 },
      ];
      seatRows.forEach(({ z, count }) => {
        for (let s = 0; s < count; s++) {
          const sx = (s - (count - 1) / 2) * 2.5;
          const seatGeo = new THREE.BoxGeometry(0.95, 0.5, 0.9);
          const seatMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.5 });
          const seat = new THREE.Mesh(seatGeo, seatMat);
          seat.position.set(sx, 0.25, z);
          scene.add(seat);

          const backGeo = new THREE.BoxGeometry(0.9, 0.75, 0.12);
          const backMesh = new THREE.Mesh(backGeo, seatMat);
          backMesh.position.set(sx, 0.68, z - 0.45);
          scene.add(backMesh);

          seat.add(new THREE.LineSegments(
            new THREE.EdgesGeometry(seatGeo),
            new THREE.LineBasicMaterial({ color: 0x1e3a5f })
          ));
        }
      });

      // Red glow from screen
      const newsGlow = new THREE.PointLight(0xf43f5e, 5.0, 65);
      newsGlow.position.set(0, 7.5, -20);
      scene.add(newsGlow);
      const newsAmbient = new THREE.PointLight(0x200010, 2.0, 80);
      newsAmbient.position.set(0, 5, 0);
      scene.add(newsAmbient);

    } else if (phase === "role_reveal") {
      // === DRAMATIC ROLE REVEAL ENVIRONMENT ===

      // 4 spotlight cones from ceiling
      for (let i = 0; i < 4; i++) {
        const spotAngle = (i / 4) * Math.PI * 2;
        const spotX = Math.cos(spotAngle) * 5.5;
        const spotZ = Math.sin(spotAngle) * 5.5;

        const spotBeamGeo = new THREE.ConeGeometry(1.6, 9.5, 16, 1, true);
        const spotBeamMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.05, side: THREE.DoubleSide });
        const spotBeam = new THREE.Mesh(spotBeamGeo, spotBeamMat);
        spotBeam.position.set(spotX, 6.5, spotZ);
        scene.add(spotBeam);
        phaseAnimated.push({ mesh: spotBeam, anim: "pulse_opacity" });

        const spotLight = new THREE.SpotLight(0x00f0ff, 4.5, 16, Math.PI / 8, 0.3);
        spotLight.position.set(spotX, 9.5, spotZ);
        spotLight.target.position.set(spotX * 0.3, 0, spotZ * 0.3);
        scene.add(spotLight);
        scene.add(spotLight.target);
      }

      // 3D Floating card meshes fanned out in air
      const numCards = Math.max(3, Math.min(playerCount, 8));
      for (let i = 0; i < numCards; i++) {
        const frac = numCards > 1 ? i / (numCards - 1) : 0.5;
        const angle = (frac - 0.5) * Math.PI * 0.65;

        const cardGeo = new THREE.BoxGeometry(0.68, 0.98, 0.048);
        const cardMat = new THREE.MeshStandardMaterial({
          color: 0x070f1e, roughness: 0.1, metalness: 0.95,
          emissive: 0x00f0ff, emissiveIntensity: 0.1,
        });
        const card = new THREE.Mesh(cardGeo, cardMat);
        const arcR = 2.9;
        card.position.set(Math.sin(angle) * arcR, 2.6 + Math.cos(Math.abs(angle)) * 0.4, -1.5 + Math.cos(angle) * 0.6);
        card.rotation.y = -angle;
        card.rotation.z = angle * 0.08;

        card.add(new THREE.LineSegments(new THREE.EdgesGeometry(cardGeo), new THREE.LineBasicMaterial({ color: 0x00f0ff })));

        // Glowing question mark surface
        const symGeo = new THREE.PlaneGeometry(0.32, 0.48);
        const symMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
        const sym = new THREE.Mesh(symGeo, symMat);
        sym.position.z = 0.025;
        card.add(sym);

        scene.add(card);
        phaseAnimated.push({ mesh: card, anim: "card_float", baseY: card.position.y });
      }

      // Dramatic center reveal lights
      const revealLight1 = new THREE.PointLight(0x00f0ff, 6.5, 22);
      revealLight1.position.set(0, 4.5, -1);
      scene.add(revealLight1);
      const revealLight2 = new THREE.PointLight(0xf59e0b, 3.0, 30);
      revealLight2.position.set(0, 2, 2);
      scene.add(revealLight2);
    }

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

    // 8. 3D LASER TARGETING LINE
    const laserLineMat = new THREE.LineBasicMaterial({
      color: 0xef4444,
      linewidth: 3,
      transparent: true,
      opacity: 0.9,
    });
    const laserLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    const laserLine = new THREE.Line(laserLineGeo, laserLineMat);
    laserLine.visible = false;
    scene.add(laserLine);

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

    // Instantiate all characters from gameState
    const playerList = Object.entries(gameState.players);
    playerList.forEach(([pid, p], idx) => {
      const isMe = pid === myId;
      const model = buildCharacterModel(p, isMe);
      const isMeeting = phase === "round_table_meeting";

      let px = p.x ?? 0;
      let pz = p.z ?? 0;
      let rot = p.rotation ?? 0;

      if (isMeeting) {
        // Seat players at council table
        const seat = chairPositions[idx % chairPositions.length];
        if (seat) {
          px = seat.x;
          pz = seat.z;
          rot = seat.rotation;
        }
      } else if (phase === "minigame") {
        // Position players at their terminal pods
        const tCount = Math.max(3, Math.min(playerList.length, 6));
        const tAngle = (idx / tCount) * Math.PI * 2;
        const tR = 10;
        px = Math.cos(tAngle) * tR;
        pz = Math.sin(tAngle) * tR;
        rot = Math.atan2(-Math.cos(tAngle), -Math.sin(tAngle)); // face center/terminal
      } else if (phase === "news_gazette" || phase === "morning_news") {
        // Theater row seating, face north (-Z = toward screen)
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        px = (col - 1.5) * 2.5;
        pz = row * 6 - 4;
        rot = Math.PI; // face screen (north / -Z)
      }

      model.group.position.set(px, isMeeting ? 0.35 : 0, pz);
      model.group.rotation.y = rot;
      characterMeshes[pid] = model;

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

    // 12. TAP / CLICK TO MOVE RAYCASTING
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (e: MouseEvent | TouchEvent) => {
      if (phase === "round_table_meeting") return; // Keep players seated during council meeting

      const rect = container.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(foundationMesh);

      if (intersects.length > 0) {
        const point = intersects[0].point;
        const tx = Math.max(-36, Math.min(36, point.x));
        const tz = Math.max(-36, Math.min(36, point.z));
        targetPosRef.current = { x: tx, z: tz };

        beaconMesh.position.set(tx, 0.36, tz);
        beaconMesh.material.opacity = 0.9;
        beaconMesh.scale.set(1, 1, 1);
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

      // Spin crystal & craft hologram
      crystalMesh.rotation.y += 0.8 * dt;
      crystalMesh.rotation.x = Math.sin(elapsedTime * 1.5) * 0.2;
      craftHolo.rotation.z += 1.2 * dt;

      // Animate phase-specific 3D environment props
      phaseAnimated.forEach(({ mesh, anim, baseY }) => {
        const bY = baseY ?? mesh.position.y;
        switch (anim) {
          case "float_spin":
            mesh.position.y = bY + Math.sin(elapsedTime * 2.2) * 0.18;
            mesh.rotation.y += 0.9 * dt;
            break;
          case "float_spin_inv":
            mesh.position.y = bY + Math.sin(elapsedTime * 2.2) * 0.18;
            mesh.rotation.y -= 0.55 * dt;
            break;
          case "float_slow":
            mesh.position.y = bY + Math.sin(elapsedTime * 1.8 + 0.5) * 0.12;
            break;
          case "float_tilt":
            mesh.position.y = bY + Math.sin(elapsedTime * 1.5) * 0.1;
            mesh.rotation.z = Math.sin(elapsedTime * 0.8) * 0.08;
            break;
          case "spin_gear":
            mesh.rotation.z += 2.2 * dt;
            break;
          case "card_float":
            mesh.position.y = bY + Math.sin(elapsedTime * 1.9 + mesh.position.x * 0.5) * 0.13;
            mesh.rotation.z = Math.sin(elapsedTime * 0.9 + bY) * 0.06;
            break;
          case "scan": {
            // Scan line sweeps up and down within screen area
            const sweep = Math.sin(elapsedTime * 1.1) * 2.4;
            mesh.position.y = bY + sweep;
            break;
          }
          case "pulse_opacity": {
            const mat = (mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
            if (mat && mat.transparent) {
              mat.opacity = 0.02 + Math.abs(Math.sin(elapsedTime * 1.3)) * 0.06;
            }
            break;
          }
          case "screen_flicker": {
            const mat = (mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
            if (mat) {
              const flick = Math.random() > 0.985 ? 0.25 : 1.0;
              mat.opacity = flick;
              mat.transparent = flick < 1;
            }
            break;
          }
          case "pulse_emissive_col": {
            const mat = (mesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (mat && mat.emissiveIntensity !== undefined) {
              mat.emissiveIntensity = 0.2 + Math.abs(Math.sin(elapsedTime * 2.0)) * 0.35;
            }
            break;
          }
        }
      });

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

      // Update 3D Laser Targeting Line
      if (selectedTargetId && characterMeshes[selectedTargetId] && characterMeshes[myId]) {
        const myP = characterMeshes[myId].group.position;
        const targetP = characterMeshes[selectedTargetId].group.position;
        const pts = [
          new THREE.Vector3(myP.x, 1.25, myP.z),
          new THREE.Vector3(targetP.x, 1.25, targetP.z),
        ];
        laserLine.geometry.setFromPoints(pts);
        laserLine.visible = true;
      } else {
        laserLine.visible = false;
      }

      // --- CAMERA POSITIONING BASED ON GAME PHASE ---
      if (phase === "round_table_meeting") {
        // Cinematic orbit around council table
        const targetCamX = Math.sin(elapsedTime * 0.12) * 4.0;
        const targetCamZ = 10.5;
        camera.position.x += (targetCamX - camera.position.x) * 0.045;
        camera.position.y += (7.5 - camera.position.y) * 0.045;
        camera.position.z += (targetCamZ - camera.position.z) * 0.045;
        camera.lookAt(0, 1.4, -1);
      } else if (phase === "minigame") {
        // Top-down view of terminal circle
        camera.position.x += (localPosRef.current.x * 0.25 - camera.position.x) * 0.05;
        camera.position.y += (17 - camera.position.y) * 0.05;
        camera.position.z += (10 - camera.position.z) * 0.05;
        camera.lookAt(0, 0, -6);
      } else if (phase === "news_gazette" || phase === "morning_news") {
        // Behind the theater audience, facing the big screen
        camera.position.x += (Math.sin(elapsedTime * 0.08) * 3 - camera.position.x) * 0.04;
        camera.position.y += (8.5 - camera.position.y) * 0.04;
        camera.position.z += (12 - camera.position.z) * 0.04;
        camera.lookAt(0, 7.8, -25);
      } else if (phase === "role_reveal") {
        // Framing the floating cards
        camera.position.x += (0 - camera.position.x) * 0.05;
        camera.position.y += (8.5 - camera.position.y) * 0.05;
        camera.position.z += (11.5 - camera.position.z) * 0.05;
        camera.lookAt(0, 1.2, 0);
      } else {
        // Follow-camera in free-roam mode
        const targetCamX = localPosRef.current.x;
        const targetCamZ = localPosRef.current.z + 17;
        camera.position.x += (targetCamX - camera.position.x) * 0.08;
        camera.position.y += (19 - camera.position.y) * 0.08;
        camera.position.z += (targetCamZ - camera.position.z) * 0.08;
        camera.lookAt(localPosRef.current.x, 0.8, localPosRef.current.z);
      }

      // --- LOCAL PLAYER MOVEMENT CALCULATION (Allowed when not locked in meeting) ---
      const canMoveFreely = phase !== "round_table_meeting";

      let moveX = 0;
      let moveZ = 0;

      if (canMoveFreely) {
        // A. Joystick Input
        if (joystickActive) {
          moveX = joystickDirRef.current.x;
          moveZ = joystickDirRef.current.y;
        }

        // B. Keyboard WASD Input
        const keys = keysPressedRef.current;
        if (keys["KeyW"] || keys["ArrowUp"]) moveZ -= 1;
        if (keys["KeyS"] || keys["ArrowDown"]) moveZ += 1;
        if (keys["KeyA"] || keys["ArrowLeft"]) moveX -= 1;
        if (keys["KeyD"] || keys["ArrowRight"]) moveX += 1;

        // C. Tap-to-move navigation
        if (targetPosRef.current && moveX === 0 && moveZ === 0) {
          const dx = targetPosRef.current.x - localPosRef.current.x;
          const dz = targetPosRef.current.z - localPosRef.current.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.4) {
            moveX = dx / dist;
            moveZ = dz / dist;
          } else {
            targetPosRef.current = null;
          }
        }
      }

      const isMoving = Math.hypot(moveX, moveZ) > 0.05;
      const speed = 7.5;

      if (isMoving && canMoveFreely) {
        const mag = Math.hypot(moveX, moveZ);
        const normX = (moveX / mag) * speed * dt;
        const normZ = (moveZ / mag) * speed * dt;

        localPosRef.current.x = Math.max(-36, Math.min(36, localPosRef.current.x + normX));
        localPosRef.current.z = Math.max(-36, Math.min(36, localPosRef.current.z + normZ));
        localPosRef.current.rotation = Math.atan2(moveX, moveZ);
        localPosRef.current.isMoving = true;
      } else {
        localPosRef.current.isMoving = false;
      }

      // Update Local Player 3D Mesh
      const myModel = characterMeshes[myId];
      if (myModel) {
        if (canMoveFreely) {
          myModel.group.position.x = localPosRef.current.x;
          myModel.group.position.z = localPosRef.current.z;
          myModel.group.rotation.y = localPosRef.current.rotation;
        }

        // Cute Waddling Animation while walking (Fall Guys style)
        if (isMoving && canMoveFreely) {
          myModel.body.rotation.z = Math.sin(elapsedTime * 14) * 0.18;
          myModel.group.position.y = Math.abs(Math.sin(elapsedTime * 14)) * 0.18;
          if (myModel.tail) {
            myModel.tail.rotation.z = Math.sin(elapsedTime * 14) * 0.35;
          }
        } else {
          myModel.body.rotation.z = 0;
          myModel.group.position.y = phase === "round_table_meeting" ? 0.35 : Math.sin(elapsedTime * 2.5) * 0.04;
          if (myModel.tail) {
            myModel.tail.rotation.z = Math.sin(elapsedTime * 3) * 0.15;
          }
        }

        // Cute Eye Blink
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
        }

        if (phase === "round_table_meeting") {
          const seat = chairPositions[idx % chairPositions.length];
          if (seat) {
            model.group.position.set(seat.x, 0.35, seat.z);
            model.group.rotation.y = seat.rotation;
          }
        } else if (phase === "minigame") {
          const tCount = Math.max(3, Math.min(playerList.length, 6));
          const tAngle = (idx / tCount) * Math.PI * 2;
          const tR = 10;
          model.group.position.x += (Math.cos(tAngle) * tR - model.group.position.x) * 0.08;
          model.group.position.z += (Math.sin(tAngle) * tR - model.group.position.z) * 0.08;
          model.group.rotation.y = Math.atan2(-Math.cos(tAngle), -Math.sin(tAngle));
        } else if (phase === "news_gazette" || phase === "morning_news") {
          const col = idx % 4;
          const row = Math.floor(idx / 4);
          const tX = (col - 1.5) * 2.5;
          const tZ = row * 6 - 4;
          model.group.position.x += (tX - model.group.position.x) * 0.08;
          model.group.position.z += (tZ - model.group.position.z) * 0.08;
          model.group.rotation.y = Math.PI;
        } else if (p.x !== undefined && p.z !== undefined) {
          model.group.position.x += (p.x - model.group.position.x) * 0.15;
          model.group.position.z += (p.z - model.group.position.z) * 0.15;
          if (p.rotation !== undefined) {
            model.group.rotation.y = p.rotation;
          }
          if (p.isMoving) {
            model.body.rotation.z = Math.sin(elapsedTime * 14) * 0.18;
            model.group.position.y = Math.abs(Math.sin(elapsedTime * 14)) * 0.18;
          } else {
            model.body.rotation.z = 0;
            model.group.position.y = 0;
          }
        }
      });

      // Check Scrap Cube Proximity & Loot Collection
      if (canMoveFreely) {
        scraps.forEach((s) => {
          const dist = Math.hypot(s.x - localPosRef.current.x, s.z - localPosRef.current.z);
          if (dist < 1.6) {
            if (onCollectScrap) onCollectScrap(s.id);
          }
        });
      }

      // Check Proximity to Points of Interest
      const distToCenterTable = Math.hypot(localPosRef.current.x, localPosRef.current.z);
      const distToCraftBench = Math.hypot(localPosRef.current.x - 16, localPosRef.current.z - (-16));
      const distToMarketTerminal = Math.hypot(localPosRef.current.x - 22, localPosRef.current.z - (-4));

      if (distToCenterTable < 4.8) {
        setNearbyInteractable({ type: "table", label: "Council Round Table" });
      } else if (distToCraftBench < 3.8) {
        setNearbyInteractable({ type: "craft", label: "Crafting Bench & Depot" });
      } else if (distToMarketTerminal < 3.2) {
        setNearbyInteractable({ type: "terminal", label: "Black Market Terminal" });
      } else {
        let foundScrap: { id: string; label: string } | null = null;
        scraps.forEach((s) => {
          const d = Math.hypot(s.x - localPosRef.current.x, s.z - localPosRef.current.z);
          if (d < 2.5) {
            foundScrap = { id: s.id, label: `Scrap Resource (${String(s.item).replace(/_/g, " ")})` };
          }
        });
        if (foundScrap !== null) {
          const scrapItem: { id: string; label: string } = foundScrap;
          setNearbyInteractable({ type: "scrap", label: scrapItem.label, id: scrapItem.id });
        } else {
          setNearbyInteractable(null);
        }
      }

      // Detect Current Sector Name
      let foundSecName = "Lockdown Room (Central Core)";
      OAKHAVEN_SECTORS.forEach((sec) => {
        if (sec.shape === "circle") {
          const d = Math.hypot(localPosRef.current.x - sec.x, localPosRef.current.z - sec.z);
          if (d < (sec.radius || 6)) {
            foundSecName = sec.name;
          }
        } else {
          const hx = (sec.width || 8) / 2;
          const hz = (sec.depth || 8) / 2;
          if (
            localPosRef.current.x >= sec.x - hx &&
            localPosRef.current.x <= sec.x + hx &&
            localPosRef.current.z >= sec.z - hz &&
            localPosRef.current.z <= sec.z + hz
          ) {
            foundSecName = sec.name;
          }
        }
      });
      setCurrentSectorName(foundSecName);

      // Network Sync (Throttle to 50ms)
      const curNow = performance.now();
      if (curNow - lastNetworkSync > 50 && onMovePlayer && canMoveFreely) {
        onMovePlayer(
          Math.round(localPosRef.current.x * 100) / 100,
          Math.round(localPosRef.current.z * 100) / 100,
          Math.round(localPosRef.current.rotation * 100) / 100,
          localPosRef.current.isMoving,
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
