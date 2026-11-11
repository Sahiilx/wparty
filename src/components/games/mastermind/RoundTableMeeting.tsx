"use client";

import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import {
  Shield,
  Zap,
  Crosshair,
  Heart,
  Skull,
  Lock,
  Eye,
  Radio,
  Sparkles,
  AlertTriangle,
  Send,
  Target,
  Smile,
  Maximize2,
} from "lucide-react";
import { MastermindRole, MastermindPlayerInfo } from "../../../../party/types";

export interface RoleAbilitySpec {
  passive: { name: string; desc: string; icon: string };
  normal1: { name: string; desc: string; icon: string; requiresTarget: boolean; isLethal?: boolean };
  normal2: { name: string; desc: string; icon: string; requiresTarget: boolean; isLethal?: boolean };
  ultimate: { name: string; desc: string; icon: string; requiresTarget: boolean };
}

export const ROLE_ABILITIES: Record<MastermindRole, RoleAbilitySpec> = {
  sheriff: {
    passive: {
      name: "Ballistic Intel & Audit",
      desc: "Gains directional radar alerts on gunfire and terminal breaches.",
      icon: "🔍",
    },
    normal1: {
      name: "Investigation",
      desc: "Investigate target operative's secret alignment (Suspicious vs Innocent).",
      icon: "🔎",
      requiresTarget: true,
    },
    normal2: {
      name: "Service Pistol",
      desc: "Fires a regulated shot at target; inflicts 1 Wound.",
      icon: "🔫",
      requiresTarget: true,
      isLethal: true,
    },
    ultimate: {
      name: "Lockout Arrest",
      desc: "Completely freezes a player for 1 round (cannot buy, use abilities, or move coins).",
      icon: "⛓️",
      requiresTarget: true,
    },
  },
  killer: {
    passive: {
      name: "Shadow Step",
      desc: "Moves silently with zero footstep pings in dark or dynamic fog sectors.",
      icon: "👤",
    },
    normal1: {
      name: "Steal Half Points",
      desc: "Silently siphons 50% of target operative's coins.",
      icon: "💰",
      requiresTarget: true,
    },
    normal2: {
      name: "Covert Gun Strike",
      desc: "Fires an unregistered lethal bullet; leaves forensic trace.",
      icon: "🩸",
      requiresTarget: true,
      isLethal: true,
    },
    ultimate: {
      name: "Core Meltdown Deadlock",
      desc: "Seals all operatives in their current sectors and primes the central bomb rig.",
      icon: "💥",
      requiresTarget: false,
    },
  },
  doctor: {
    passive: {
      name: "Triage Awareness",
      desc: "Automatically detects the exact health state of all operatives at round start.",
      icon: "🩺",
    },
    normal1: {
      name: "First Aid",
      desc: "Applies a Bandage; prevents a Wounded player from deteriorating to Critical.",
      icon: "🩹",
      requiresTarget: true,
    },
    normal2: {
      name: "Antidote / Medicine",
      desc: "Restores 1 Wound or cures slow neurotoxin status.",
      icon: "💊",
      requiresTarget: true,
    },
    ultimate: {
      name: "Defibrillate / Revive",
      desc: "Resurrects a fallen or critical operative back to life.",
      icon: "✨",
      requiresTarget: true,
    },
  },
  thief: {
    passive: {
      name: "Master Craftsman",
      desc: "Decreased crafting costs and access to hidden ventilation shortcuts.",
      icon: "🛠️",
    },
    normal1: {
      name: "Steal Full Points",
      desc: "Empties unprotected target wallet into your private stash.",
      icon: "💎",
      requiresTarget: true,
    },
    normal2: {
      name: "Pocket Raid",
      desc: "Steals a random minor crafting component from target operative.",
      icon: "🧤",
      requiresTarget: true,
    },
    ultimate: {
      name: "Master Vault Breach",
      desc: "Disables security alarms and cracks 2 Vault gates simultaneously.",
      icon: "🔓",
      requiresTarget: false,
    },
  },
  soldier: {
    passive: {
      name: "Reinforced Plating",
      desc: "Absorbs the first Wound in each combat encounter; immune to stagger.",
      icon: "🛡️",
    },
    normal1: {
      name: "Deploy Heavy Shield",
      desc: "Projects nanite shield over self or target ally to block all incoming hits.",
      icon: "🔰",
      requiresTarget: true,
    },
    normal2: {
      name: "Fortify Barricade",
      desc: "Deploys heavy welds to reinforce shelter sectors against hostile entry.",
      icon: "🧱",
      requiresTarget: true,
    },
    ultimate: {
      name: "Central Dome Lockdown",
      desc: "Seals the central dome vault, protecting all survivors sheltered inside.",
      icon: "🏛️",
      requiresTarget: false,
    },
  },
  joker: {
    passive: {
      name: "Trickster Deception",
      desc: "Immune to forensic audit; investigations yield inverted alignment.",
      icon: "🃏",
    },
    normal1: {
      name: "Swap Places",
      desc: "Swaps physical table position and incoming status effects with target.",
      icon: "🔄",
      requiresTarget: true,
    },
    normal2: {
      name: "Steal Card",
      desc: "Swaps or confiscates a random ability/item card from target.",
      icon: "🎴",
      requiresTarget: true,
    },
    ultimate: {
      name: "Grand Swindle",
      desc: "If attacked by Town operatives tonight, you survive and claim the Town prize pool.",
      icon: "👑",
      requiresTarget: false,
    },
  },
  wizard: {
    passive: {
      name: "Arcane Sight",
      desc: "Instantly senses which operatives hold Tier 2 and Tier 3 game-ending parts.",
      icon: "🔮",
    },
    normal1: {
      name: "Kill / Revive",
      desc: "Smite an enemy operative or restore a fallen player.",
      icon: "⚡",
      requiresTarget: true,
    },
    normal2: {
      name: "Random Ability Surge",
      desc: "Channels a random active power from any class for this round.",
      icon: "🎲",
      requiresTarget: false,
    },
    ultimate: {
      name: "Chrono Reset",
      desc: "Rewinds lethal damage dealt across all sectors during the round.",
      icon: "⏳",
      requiresTarget: false,
    },
  },
  hacker: {
    passive: {
      name: "Digital Wiretap",
      desc: "Monitors electronic auction bids and security camera telemetry.",
      icon: "💻",
    },
    normal1: {
      name: "Intercept Ability",
      desc: "Nullifies target operative’s queued action for this round.",
      icon: "🚫",
      requiresTarget: true,
    },
    normal2: {
      name: "Disrupt Power Grid",
      desc: "Scrambles security cameras and locks doors in 2 sectors.",
      icon: "⚡",
      requiresTarget: true,
    },
    ultimate: {
      name: "Facility Blackout",
      desc: "Cuts power shelter-wide; disables all shields, cameras, and terminals.",
      icon: "🌑",
      requiresTarget: false,
    },
  },
};

interface RoundTableMeetingProps {
  players: MastermindPlayerInfo[];
  myPlayer: MastermindPlayerInfo;
  timer: number;
  onUseAbility: (abilityType: string, targetId?: string) => void;
  onTableAction?: (action: 'point' | 'laser' | 'emote', targetId?: string) => void;
}

export const RoundTableMeeting: React.FC<RoundTableMeetingProps> = ({
  players,
  myPlayer,
  timer,
  onUseAbility,
  onTableAction,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedAbility, setSelectedAbility] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [activeEmotes, setActiveEmotes] = useState<Record<string, string>>({});
  const [isLockedIn, setIsLockedIn] = useState(false);
  const [throwEvent, setThrowEvent] = useState<{ fromId: string; toId: string; emoji: string } | null>(null);

  const abilities = ROLE_ABILITIES[myPlayer.role] || ROLE_ABILITIES.sheriff;

  // Sync selectedTargetId ref for Three.js click handler
  const selectedTargetIdRef = useRef<string | null>(selectedTargetId);
  useEffect(() => {
    selectedTargetIdRef.current = selectedTargetId;
  }, [selectedTargetId]);

  // Handle Trigger Emote
  const handleTriggerEmote = (emote: string) => {
    setActiveEmotes((prev) => ({ ...prev, [myPlayer.id]: emote }));
    if (onTableAction) {
      onTableAction("emote", selectedTargetId || undefined);
    }
    setTimeout(() => {
      setActiveEmotes((prev) => {
        const next = { ...prev };
        delete next[myPlayer.id];
        return next;
      });
    }, 2800);
  };

  // Handle Throw Object
  const handleThrowAt = (targetId: string, emoji: string) => {
    setThrowEvent({ fromId: myPlayer.id, toId: targetId, emoji });
    if (onTableAction) {
      onTableAction("point", targetId);
    }
    setTimeout(() => {
      setThrowEvent(null);
    }, 1500);
  };

  const handleConfirmAbility = () => {
    if (!selectedAbility) return;
    onUseAbility(selectedAbility, selectedTargetId || undefined);
    setIsLockedIn(true);
  };

  // =========================================================================
  // THREE.JS 3D ROUND TABLE SCENE WITH 3D FALL-GUYS BEAN CHARACTERS
  // =========================================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060d);
    scene.fog = new THREE.FogExp2(0x04060d, 0.015);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    const cameraRadius = 13.5;
    let cameraAngle = { theta: Math.PI / 2, phi: Math.PI / 3.4 };

    const updateCamera = () => {
      camera.position.x = cameraRadius * Math.sin(cameraAngle.phi) * Math.sin(cameraAngle.theta);
      camera.position.y = cameraRadius * Math.cos(cameraAngle.phi);
      camera.position.z = cameraRadius * Math.sin(cameraAngle.phi) * Math.cos(cameraAngle.theta);
      camera.lookAt(0, 0.6, 0);
    };
    updateCamera();

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 1.2);
    scene.add(ambientLight);

    const centerLight = new THREE.PointLight(0x00f0ff, 3.5, 30);
    centerLight.position.set(0, 4.5, 0);
    scene.add(centerLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 1.2);
    rimLight.position.set(10, 15, -10);
    scene.add(rimLight);

    // 4. Floor Disc Platform (No ugly grid)
    const floorGeo = new THREE.CylinderGeometry(9, 9, 0.1, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x071526,
      roughness: 0.3,
      metalness: 0.8,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.05;
    scene.add(floorMesh);

    // Glowing rim around floor disc
    const floorRimGeo = new THREE.TorusGeometry(9, 0.08, 8, 48);
    const floorRimMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const floorRim = new THREE.Mesh(floorRimGeo, floorRimMat);
    floorRim.rotation.x = Math.PI / 2;
    floorRim.position.y = 0.01;
    scene.add(floorRim);

    // 5. Central 3D Round Conference Table
    const tableRadius = 4.2;
    const tableHeight = 0.35;
    const tableGeo = new THREE.CylinderGeometry(tableRadius, tableRadius, tableHeight, 48);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x0b1329,
      roughness: 0.15,
      metalness: 0.85,
    });
    const tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.position.y = 1.1;
    scene.add(tableMesh);

    // Table glowing neon edge rim
    const tableEdgeGeo = new THREE.TorusGeometry(tableRadius, 0.07, 12, 48);
    const tableEdgeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const tableEdge = new THREE.Mesh(tableEdgeGeo, tableEdgeMat);
    tableEdge.rotation.x = Math.PI / 2;
    tableEdge.position.y = 1.1 + tableHeight / 2;
    scene.add(tableEdge);

    // Central Hologram Projector Pedestal
    const projBaseGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.15, 32);
    const projBaseMat = new THREE.MeshStandardMaterial({ color: 0x0f2b48, roughness: 0.2, metalness: 0.8 });
    const projBase = new THREE.Mesh(projBaseGeo, projBaseMat);
    projBase.position.y = 1.35;
    scene.add(projBase);

    // Spinning Holographic Crystal in center
    const crystalGeo = new THREE.OctahedronGeometry(0.55, 0);
    const crystalMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    crystalMesh.position.y = 2.1;
    scene.add(crystalMesh);

    // Hologram light column
    const holoBeamGeo = new THREE.CylinderGeometry(0.8, 1.3, 2.2, 32, 1, true);
    const holoBeamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const holoBeam = new THREE.Mesh(holoBeamGeo, holoBeamMat);
    holoBeam.position.y = 2.2;
    scene.add(holoBeam);

    // 6. Build 3D Fall-Guys Bean Characters around the Table
    const playerObjects: Record<
      string,
      {
        group: THREE.Group;
        bodyMesh: THREE.Mesh;
        targetRing: THREE.Mesh;
        badgeSprite: THREE.Sprite;
        player: MastermindPlayerInfo;
        originalColor: string;
      }
    > = {};

    const clickableMeshes: THREE.Object3D[] = [];

    const numPlayers = Math.max(players.length, 1);
    const sitRadius = 5.2;

    players.forEach((p, idx) => {
      const angle = (idx / numPlayers) * Math.PI * 2 + Math.PI / 2;
      const px = Math.cos(angle) * sitRadius;
      const pz = Math.sin(angle) * sitRadius;

      const playerGroup = new THREE.Group();
      playerGroup.position.set(px, 0, pz);
      // Face towards center table
      playerGroup.lookAt(0, 0, 0);

      const isDead = p.health === "dead";
      const charColor = isDead ? "#475569" : p.color || "#0ea5e9";

      // A. Bean / Capsule Body (Fall Guys Style!)
      const bodyGeo = new THREE.CapsuleGeometry(0.52, 0.85, 16, 16);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(charColor),
        roughness: 0.25,
        metalness: 0.1,
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.y = 1.15;
      bodyMesh.userData = { playerId: p.id };
      playerGroup.add(bodyMesh);
      clickableMeshes.push(bodyMesh);

      // B. Faceplate / Visor (Fall Guys glossy visor)
      const visorGeo = new THREE.SphereGeometry(0.32, 16, 16);
      visorGeo.scale(1.15, 0.9, 0.35);
      const visorMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.05,
      });
      const visorMesh = new THREE.Mesh(visorGeo, visorMat);
      visorMesh.position.set(0, 1.45, 0.42);
      playerGroup.add(visorMesh);

      // Cute Black Bead Eyes
      const eyeGeo = new THREE.SphereGeometry(0.055, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111827 });

      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.11, 1.48, 0.54);
      playerGroup.add(leftEye);

      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.11, 1.48, 0.54);
      playerGroup.add(rightEye);

      // C. Cute Little Arms Resting Forward on Table
      const armGeo = new THREE.CapsuleGeometry(0.11, 0.45, 8, 8);
      const armMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(charColor),
        roughness: 0.3,
      });

      const leftArm = new THREE.Mesh(armGeo, armMat);
      leftArm.position.set(-0.52, 1.1, 0.25);
      leftArm.rotation.x = Math.PI / 4;
      leftArm.rotation.z = -Math.PI / 8;
      playerGroup.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, armMat);
      rightArm.position.set(0.52, 1.1, 0.25);
      rightArm.rotation.x = Math.PI / 4;
      rightArm.rotation.z = Math.PI / 8;
      playerGroup.add(rightArm);

      // D. Conference Chair Behind Character
      const chairBackGeo = new THREE.BoxGeometry(1.25, 1.6, 0.15);
      const chairMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
      const chairBack = new THREE.Mesh(chairBackGeo, chairMat);
      chairBack.position.set(0, 1.35, -0.45);
      playerGroup.add(chairBack);

      // E. Selection Target Ring under player
      const ringGeo = new THREE.RingGeometry(0.7, 0.9, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      });
      const targetRing = new THREE.Mesh(ringGeo, ringMat);
      targetRing.rotation.x = Math.PI / 2;
      targetRing.position.y = 0.05;
      playerGroup.add(targetRing);

      // F. Floating Billboard Name Tag / Badge
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 72;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "rgba(4, 6, 13, 0.85)";
        ctx.roundRect(4, 4, 248, 64, 12);
        ctx.fill();
        ctx.strokeStyle = charColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = "bold 26px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        const isMeText = p.id === myPlayer.id ? " (YOU)" : "";
        ctx.fillText(`${p.avatar} ${p.name}${isMeText}`, 128, 44);
      }
      const badgeTex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: badgeTex, transparent: true });
      const badgeSprite = new THREE.Sprite(spriteMat);
      badgeSprite.scale.set(1.8, 0.5, 1);
      badgeSprite.position.set(0, 2.45, 0);
      playerGroup.add(badgeSprite);

      scene.add(playerGroup);

      playerObjects[p.id] = {
        group: playerGroup,
        bodyMesh,
        targetRing,
        badgeSprite,
        player: p,
        originalColor: charColor,
      };
    });

    // 7. Interactive Pointer Controls & Orbiting
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    const onPointerDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouse.x;
      const deltaY = e.clientY - prevMouse.y;

      cameraAngle.theta -= deltaX * 0.007;
      cameraAngle.phi = Math.max(0.2, Math.min(Math.PI / 2.3, cameraAngle.phi - deltaY * 0.007));

      prevMouse = { x: e.clientX, y: e.clientY };
      updateCamera();
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.multiplyScalar(e.deltaY > 0 ? 1.05 : 0.95);
      camera.lookAt(0, 0.6, 0);
    };

    // Click Detection on 3D Characters
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(clickableMeshes, true);

      if (intersects.length > 0) {
        const hitId = intersects[0].object.userData.playerId;
        if (hitId && hitId !== myPlayer.id) {
          setSelectedTargetId(hitId);
        }
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    domEl.addEventListener("wheel", onWheel, { passive: false });
    domEl.addEventListener("click", onClick);

    // 8. 3D Projectile / VFX Dynamic Group
    const vfxGroup = new THREE.Group();
    scene.add(vfxGroup);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Spin central hologram diamond
      crystalMesh.rotation.y = elapsed * 1.5;
      crystalMesh.rotation.x = Math.sin(elapsed) * 0.4;
      holoBeam.rotation.y = -elapsed * 0.5;

      // Update Selection Rings & Idle Bobbing for 3D Characters
      const currentSelected = selectedTargetIdRef.current;

      Object.entries(playerObjects).forEach(([pid, obj]) => {
        const isSelected = pid === currentSelected;
        const ringMat = obj.targetRing.material as THREE.MeshBasicMaterial;

        if (isSelected) {
          ringMat.opacity = 0.8 + Math.sin(elapsed * 6) * 0.2;
          ringMat.color.setHex(0x00f0ff);
          obj.bodyMesh.position.y = 1.15 + Math.sin(elapsed * 4) * 0.08;
        } else {
          ringMat.opacity = 0;
          obj.bodyMesh.position.y = 1.15 + Math.sin(elapsed * 2 + Number(pid.slice(-1) || 0)) * 0.02;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      domEl.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      domEl.removeEventListener("wheel", onWheel);
      domEl.removeEventListener("click", onClick);
      renderer.dispose();
    };
  }, [players, myPlayer.id]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-4 sm:p-6 bg-slate-950 text-white rounded-3xl border border-cyan-500/30 shadow-2xl overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between border-b border-cyan-500/20 pb-3 z-10">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Phase 2: 3D Council Chamber</span>
          </div>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Drag to Rotate • Click 3D Operative to Target
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-xs font-bold text-slate-400">Time:</span>
          <span className="font-mono text-sm font-black text-amber-400">{timer}s</span>
        </div>
      </div>

      {/* CENTER 3D ROUND TABLE CANVAS */}
      <div className="relative w-full max-w-4xl h-80 sm:h-96 my-2 rounded-2xl overflow-hidden border border-cyan-500/30 bg-slate-950 shadow-2xl">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* 3D Canvas HUD Overlay: Active Target indicator */}
        <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 backdrop-blur-md">
          <span className="text-xs font-bold text-slate-400">TARGET:</span>
          <span className="text-xs font-black text-cyan-300 uppercase">
            {selectedTargetId
              ? players.find((p) => p.id === selectedTargetId)?.name
              : "NONE SELECTED (Click a character)"}
          </span>
        </div>

        {/* Throwable reaction notification */}
        {throwEvent && (
          <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-950/90 border border-orange-500/60 text-orange-200 text-xs font-black animate-bounce z-20">
            <span>{throwEvent.emoji}</span>
            <span>THROWN AT {players.find((p) => p.id === throwEvent.toId)?.name}!</span>
          </div>
        )}

        <div className="absolute bottom-2 left-2 pointer-events-none text-[10px] text-cyan-400/60 font-mono">
          [ 3D FALL-GUYS PROTOCOL • CLICK CHARACTER TO TARGET ]
        </div>
      </div>

      {/* Role Card & Action Control Deck */}
      <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col gap-3 z-10 backdrop-blur-md">
        {/* Role Bar & Passive Trait */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Assigned Secret Role:</span>
            <span className="text-sm font-black text-cyan-300 uppercase tracking-wider">
              {myPlayer.role}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-950/60 border border-purple-500/40 text-[10px] text-purple-300 font-bold">
            <span>{abilities.passive.icon}</span>
            <span>Passive: {abilities.passive.name}</span>
          </div>
        </div>

        {/* 3 Active Abilities: Normal 1, Normal 2, Ultimate */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Normal 1 */}
          <button
            onClick={() => setSelectedAbility("normal1")}
            disabled={isLockedIn}
            className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${selectedAbility === "normal1"
              ? "bg-cyan-950/80 border-cyan-400 text-white shadow-lg shadow-cyan-950/80 scale-[1.02]"
              : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-base">{abilities.normal1.icon}</span>
              <span className="text-[10px] font-black uppercase text-cyan-400">Normal I</span>
            </div>
            <span className="text-xs font-bold text-white truncate">{abilities.normal1.name}</span>
            <span className="text-[10px] text-slate-400 line-clamp-2 mt-1">
              {abilities.normal1.desc}
            </span>
          </button>

          {/* Normal 2 */}
          <button
            onClick={() => setSelectedAbility("normal2")}
            disabled={isLockedIn}
            className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${selectedAbility === "normal2"
              ? "bg-cyan-950/80 border-cyan-400 text-white shadow-lg shadow-cyan-950/80 scale-[1.02]"
              : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-base">{abilities.normal2.icon}</span>
              <span className="text-[10px] font-black uppercase text-cyan-400">Normal II</span>
            </div>
            <span className="text-xs font-bold text-white truncate">{abilities.normal2.name}</span>
            <span className="text-[10px] text-slate-400 line-clamp-2 mt-1">
              {abilities.normal2.desc}
            </span>
          </button>

          {/* Ultimate */}
          <button
            onClick={() => setSelectedAbility("ultimate")}
            disabled={isLockedIn}
            className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${selectedAbility === "ultimate"
              ? "bg-amber-950/80 border-amber-400 text-white shadow-lg shadow-amber-950/80 scale-[1.02]"
              : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-base">{abilities.ultimate.icon}</span>
              <span className="text-[10px] font-black uppercase text-amber-400">Ultimate</span>
            </div>
            <span className="text-xs font-bold text-white truncate">{abilities.ultimate.name}</span>
            <span className="text-[10px] text-slate-400 line-clamp-2 mt-1">
              {abilities.ultimate.desc}
            </span>
          </button>
        </div>

        {/* Lock-In Action & Target Confirmation + Throwable Items */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-slate-800 gap-2">
          {/* Throwable item buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Throw:</span>
            {["🍅", "💣", "🎃", "🧨", "🪃"].map((item) => (
              <button
                key={item}
                onClick={() => {
                  if (selectedTargetId) {
                    handleThrowAt(selectedTargetId, item);
                  } else {
                    alert("Click an operative in the 3D scene first to throw at them!");
                  }
                }}
                className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-orange-950/80 hover:border-orange-500 border border-slate-700 text-sm transition active:scale-90"
                title={`Throw ${item} at target`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Playful Reaction Emote Buttons */}
            <div className="flex items-center gap-1 mr-2">
              {["🎯", "👀", "🤫", "🍿"].map((em) => (
                <button
                  key={em}
                  onClick={() => handleTriggerEmote(em)}
                  className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm transition-transform active:scale-90"
                >
                  {em}
                </button>
              ))}
            </div>

            <button
              onClick={handleConfirmAbility}
              disabled={isLockedIn || !selectedAbility}
              className="py-2.5 px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-600/30 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>{isLockedIn ? "Action Locked" : "Confirm Ability"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

