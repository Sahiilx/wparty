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

export interface ThrowEvent {
  id: string;
  fromId: string;
  toId?: string;
  item: "tomato" | "balloon" | "popper" | "duck" | "bomb";
  startX: number;
  startZ: number;
  targetX: number;
  targetZ: number;
  progress: number;
}

interface Mastermind3DWorldProps {
  gameState: MastermindGameState;
  myId: string;
  themePrimary?: string;
  onMovePlayer?: (x: number, z: number, rotation: number, isMoving: boolean, skin?: string, sectorId?: string) => void;
  onCollectScrap?: (scrapId: string) => void;
  onSelectSkin?: (skin: string) => void;
  onUseAbility?: (abilityType: string, targetId?: string) => void;
  onInteract?: (type: "table" | "craft" | "terminal" | "scrap", entityId?: string) => void;
  onTriggerEmote?: (emote: string) => void;
  onThrowItem?: (item: "tomato" | "balloon" | "popper" | "duck" | "bomb", targetId?: string) => void;
}

export const Mastermind3DWorld: React.FC<Mastermind3DWorldProps> = ({
  gameState,
  myId,
  themePrimary = "#00f0ff",
  onMovePlayer,
  onCollectScrap,
  onSelectSkin,
  onUseAbility,
  onInteract,
  onTriggerEmote,
  onThrowItem,
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

  // Throw Harmless Item
  const handleThrow = (item: "tomato" | "balloon" | "popper" | "duck" | "bomb") => {
    setThrowWheelOpen(false);
    // Find closest player to throw at
    const otherPlayers = Object.entries(gameState.players).filter(([id]) => id !== myId);
    let closestId: string | undefined;
    let closestDist = Infinity;
    otherPlayers.forEach(([id, p]) => {
      const d = Math.hypot((p.x ?? 0) - localPosRef.current.x, (p.z ?? 0) - localPosRef.current.z);
      if (d < closestDist) {
        closestDist = d;
        closestId = id;
      }
    });

    if (onThrowItem) {
      onThrowItem(item, closestId);
    } else {
      const emojiMap = { tomato: "🍅", balloon: "🎈", popper: "🎉", duck: "🦆", bomb: "💣" };
      handleSendEmote(emojiMap[item]);
    }
  };

  // =========================================================================
  // KEYBOARD CONTROLS (WASD / Arrows)
  // =========================================================================
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = true;
      if (e.code === "KeyE" && nearbyInteractable) {
        if (onInteract) onInteract(nearbyInteractable.type, nearbyInteractable.id);
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
  }, [nearbyInteractable, onInteract]);

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

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene, Camera & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712);
    scene.fog = new THREE.FogExp2(0x030712, 0.012);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 180);
    camera.position.set(0, 19, 17);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 2. Lighting System
    const ambientLight = new THREE.AmbientLight(0x1e293b, 2.5);
    scene.add(ambientLight);

    const mainCenterLight = new THREE.PointLight(0x00f0ff, 5.0, 150);
    mainCenterLight.position.set(0, 14, 0);
    mainCenterLight.castShadow = true;
    scene.add(mainCenterLight);

    const northLight = new THREE.PointLight(0x38bdf8, 3.0, 80);
    northLight.position.set(0, 8, -20);
    scene.add(northLight);

    const southLight = new THREE.PointLight(0xf59e0b, 3.0, 80);
    southLight.position.set(0, 8, 20);
    scene.add(southLight);

    const westLight = new THREE.PointLight(0x10b981, 3.0, 80);
    westLight.position.set(-20, 8, 0);
    scene.add(westLight);

    const eastLight = new THREE.PointLight(0xeab308, 3.0, 80);
    eastLight.position.set(20, 8, 0);
    scene.add(eastLight);

    // 3. UNIFIED FACILITY FOUNDATION (Outer Boundary)
    const foundationGeo = new THREE.BoxGeometry(78, 0.4, 78);
    const foundationMat = new THREE.MeshPhongMaterial({
      color: 0x050d1a,
      shininess: 90,
    });
    const foundationMesh = new THREE.Mesh(foundationGeo, foundationMat);
    foundationMesh.position.set(0, 0.1, 0);
    foundationMesh.receiveShadow = true;
    scene.add(foundationMesh);

    // Grid Overlay on floor
    const gridHelper = new THREE.GridHelper(76, 38, 0x0284c7, 0x0e2744);
    gridHelper.position.y = 0.32;
    scene.add(gridHelper);

    // 4. ARCHITECTURAL FACILITY ROOMS & WALLS (EXACTLY MATCHING BLUEPRINT)
    // - Central Lockdown Dome (circle)
    // - Ring corridor (circle)
    // - 4 Vaults V1, V2, V3, V4 (circles) with RED blast door gates
    // - Central square frame enclosing the ring
    // - Axial Corridors (North, South, East, West)
    // - Northwest Doctor's Clinic dome
    // - Southeast Gas Chamber dome
    // - Quadrant research rooms with doorways
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

      // Doorway Portals
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

    // Center spinning holographic crystal
    const crystalGeo = new THREE.OctahedronGeometry(0.55, 0);
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    crystalMesh.position.set(0, 1.9, 0);
    scene.add(crystalMesh);

    // Chairs around the council table (6 ergonomic swivel seats)
    const chairCount = 6;
    for (let i = 0; i < chairCount; i++) {
      const angle = (i * 2 * Math.PI) / chairCount;
      const chairGroup = new THREE.Group();
      chairGroup.position.set(Math.cos(angle) * 5.2, 0.35, Math.sin(angle) * 5.2);
      chairGroup.rotation.y = -angle + Math.PI / 2;

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

    // 6. CRAFTING BENCH & DEPOT STATION (In Tactical Workshop Sector)
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

    // 8. TAP-TO-MOVE DESTINATION BEACON RING
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

    // 9. 3D CHARACTERS POOL (Fall-Guys / Mecha-Chameleon models with 8 Cute Skins)
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

        // 3 neon dorsal spikes
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
    Object.entries(gameState.players).forEach(([pid, p]) => {
      const isMe = pid === myId;
      const model = buildCharacterModel(p, isMe);
      const px = p.x ?? (isMe ? 0 : Math.cos(Number(pid.slice(-1) || 0)) * 6);
      const pz = p.z ?? (isMe ? 0 : Math.sin(Number(pid.slice(-1) || 0)) * 6);
      model.group.position.set(px, 0, pz);
      characterMeshes[pid] = model;

      if (isMe) {
        localPosRef.current = { x: px, z: pz, rotation: p.rotation ?? 0, isMoving: false };
      }
    });

    // 10. TAP / CLICK TO MOVE RAYCASTING
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (e: MouseEvent | TouchEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(foundationMesh);

      if (intersects.length > 0) {
        const point = intersects[0].point;
        // Clamp inside facility bounds
        const tx = Math.max(-36, Math.min(36, point.x));
        const tz = Math.max(-36, Math.min(36, point.z));
        targetPosRef.current = { x: tx, z: tz };

        // Position beacon ring
        beaconMesh.position.set(tx, 0.36, tz);
        beaconMesh.material.opacity = 0.9;
        beaconMesh.scale.set(1, 1, 1);
      }
    };

    container.addEventListener("click", handleCanvasClick);

    // 11. MAIN ANIMATION & GAME LOOP
    let animId: number;
    let clock = new THREE.Clock();
    let lastNetworkSync = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Spin crystal & craft hologram
      crystalMesh.rotation.y += 0.8 * dt;
      crystalMesh.rotation.x = Math.sin(elapsedTime * 1.5) * 0.2;
      craftHolo.rotation.z += 1.2 * dt;

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

      // --- LOCAL PLAYER MOVEMENT CALCULATION ---
      let moveX = 0;
      let moveZ = 0;

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

      const isMoving = Math.hypot(moveX, moveZ) > 0.05;
      const speed = 7.5;

      if (isMoving) {
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
        myModel.group.position.x = localPosRef.current.x;
        myModel.group.position.z = localPosRef.current.z;
        myModel.group.rotation.y = localPosRef.current.rotation;

        // Cute Waddling Animation while walking (Fall Guys style)
        if (isMoving) {
          myModel.body.rotation.z = Math.sin(elapsedTime * 14) * 0.18;
          myModel.group.position.y = Math.abs(Math.sin(elapsedTime * 14)) * 0.18;
          if (myModel.tail) {
            myModel.tail.rotation.z = Math.sin(elapsedTime * 14) * 0.35;
          }
        } else {
          myModel.body.rotation.z = 0;
          myModel.group.position.y = Math.sin(elapsedTime * 2.5) * 0.04;
          if (myModel.tail) {
            myModel.tail.rotation.z = Math.sin(elapsedTime * 3) * 0.15;
          }
        }

        // Cute Eye Blink
        const blink = Math.sin(elapsedTime * 1.8) > 0.96 ? 0.1 : 1.0;
        myModel.leftEye.scale.y = blink;
        myModel.rightEye.scale.y = blink;

        // Smooth Camera Follow
        const targetCamX = localPosRef.current.x;
        const targetCamZ = localPosRef.current.z + 17;
        camera.position.x += (targetCamX - camera.position.x) * 0.08;
        camera.position.z += (targetCamZ - camera.position.z) * 0.08;
        camera.lookAt(localPosRef.current.x, 0.8, localPosRef.current.z);
      }

      // Update Remote Players from gameState
      Object.entries(gameState.players).forEach(([pid, p]) => {
        if (pid === myId) return;
        let model = characterMeshes[pid];
        if (!model) {
          model = buildCharacterModel(p, false);
          characterMeshes[pid] = model;
        }
        if (p.x !== undefined && p.z !== undefined) {
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
      scraps.forEach((s) => {
        const dist = Math.hypot(s.x - localPosRef.current.x, s.z - localPosRef.current.z);
        if (dist < 1.6) {
          if (onCollectScrap) onCollectScrap(s.id);
        }
      });

      // Check Proximity to Points of Interest
      const distToCenterTable = Math.hypot(localPosRef.current.x, localPosRef.current.z);
      const distToCraftBench = Math.hypot(localPosRef.current.x - 16, localPosRef.current.z - (-16));

      if (distToCenterTable < 4.8) {
        setNearbyInteractable({ type: "table", label: "Council Round Table" });
      } else if (distToCraftBench < 3.8) {
        setNearbyInteractable({ type: "craft", label: "Crafting Bench & Depot" });
      } else {
        // Check scrap proximity
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

      // Detect Current Sector Name from coordinates
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
      const now = performance.now();
      if (now - lastNetworkSync > 50 && onMovePlayer) {
        onMovePlayer(
          Math.round(localPosRef.current.x * 100) / 100,
          Math.round(localPosRef.current.z * 100) / 100,
          Math.round(localPosRef.current.rotation * 100) / 100,
          localPosRef.current.isMoving,
          currentSkin,
          foundSecName
        );
        lastNetworkSync = now;
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
  }, [gameState.worldScraps, myId, currentSkin, onMovePlayer, onCollectScrap]);

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
            {/* North Corridor */}
            <rect x="-2" y="-28" width="4" height="14" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.6" opacity="0.6" />
            {/* South Corridor */}
            <rect x="-2" y="14" width="4" height="14" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.6" opacity="0.6" />
            {/* West Corridor */}
            <rect x="-28" y="-2" width="14" height="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.6" opacity="0.6" />
            {/* East Corridor */}
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

            {/* Surrounding Research Rooms (matching blueprint layout) */}
            {/* Top-Right Quadrant Rooms */}
            <rect x="6" y="-26" width="10" height="9" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />
            <polygon points="19,-26 25,-26 27,-21 25,-16 19,-16" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />
            <rect x="16" y="-14" width="14" height="9" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />

            {/* Bottom-Right Quadrant Rooms */}
            <rect x="16" y="5" width="14" height="9" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />
            <rect x="4" y="16" width="11" height="8" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />

            {/* Bottom-Left Quadrant Rooms */}
            <polygon points="-33,8 -27,4 -22,8 -24,15 -31,15" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />
            <rect x="-24" y="5" width="8" height="9" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />
            <rect x="-26" y="16" width="9" height="8" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />
            <rect x="-16" y="16" width="10" height="11" fill="#09121f" stroke="#00f0ff" strokeWidth="0.5" opacity="0.6" />

            {/* Top-Left Quadrant Rooms */}
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
              {/* Vision Cone */}
              <polygon points="0,0 -4,10 4,10" fill="url(#radarCone)" opacity="0.4" />
              <polygon points="0,3 2.5,-3 -2.5,-3" fill="#00f0ff" stroke="#ffffff" strokeWidth="0.6" />
              <circle cx="0" cy="0" r="3.8" fill="none" stroke="#00f0ff" strokeWidth="0.8" opacity="0.7" />
            </g>

            {/* Defs for Vision Cone Gradient */}
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
      {nearbyInteractable && (
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

      {/* 5. VIRTUAL JOYSTICK (Bottom-Left - Mobile Movement) */}
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

      {/* 6. BOTTOM-RIGHT ACTION HOTBAR */}
      <div className="absolute bottom-6 right-6 z-30 flex items-end gap-2.5">
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
            title="Throw Fun Items"
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
      </div>

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
