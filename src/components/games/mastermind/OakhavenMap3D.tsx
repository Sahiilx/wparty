"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OAKHAVEN_SECTORS, SectorDef } from "./oakhavenMapData";
import { Compass, Crosshair, Eye, Zap, Target } from "lucide-react";

export interface OperativeToken {
  id: string;
  name: string; // Anonymous alias
  avatar: string;
  color: string;
  sectorId: string;
  isMe?: boolean;
  activity?: string;
}

interface OakhavenMap3DProps {
  selectedSectorId: string;
  onSelectSector: (sectorId: string) => void;
  tokens: OperativeToken[];
  noisePings?: { sectorId: string; timestamp: number }[];
  vaultBreaches?: Record<string, boolean>;
  isFortified?: boolean;
}

export const OakhavenMap3D: React.FC<OakhavenMap3DProps> = ({
  selectedSectorId,
  onSelectSector,
  tokens,
  noisePings = [],
  vaultBreaches = {},
  isFortified = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const roomMeshesRef = useRef<Record<string, { mesh: THREE.Mesh; line: THREE.LineSegments; floor: THREE.Mesh }>>({});
  const labelsGroupRef = useRef<THREE.Group | null>(null);
  const vfxGroupRef = useRef<THREE.Group | null>(null);
  const tokenMeshesRef = useRef<THREE.Group[]>([]);
  const pingsGroupRef = useRef<THREE.Group | null>(null);

  const [cameraPreset, setCameraPreset] = useState<"ISOMETRIC" | "TOP" | "FRONT">("ISOMETRIC");
  const [autoRotateCamera, setAutoRotateCamera] = useState(false);

  // Camera Orbit controls state
  const controlsRef = useRef({
    isDragging: false,
    previousMousePosition: { x: 0, y: 0 },
    rotX: 0.65,
    rotY: -0.5,
    zoom: 1.0,
  });

  // Create High-Density Billboard Telemetry Card (From Visual Reference)
  const createLabelTexture = (text: string, icon: string, status: string, occ: string, colorHex: string) => {
    const canvas = document.createElement("canvas");
    canvas.width = 380;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.Texture();

    ctx.fillStyle = "rgba(4, 6, 13, 0.92)";
    ctx.beginPath();
    ctx.roundRect(8, 8, 364, 84, 12);
    ctx.fill();

    ctx.strokeStyle = colorHex || "#00f0ff";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = "bold 17px monospace";
    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "left";
    ctx.shadowColor = "#06b6d4";
    ctx.shadowBlur = 8;
    ctx.fillText(`${icon} ${text.toUpperCase()}`, 20, 38);

    ctx.fillStyle = "rgba(6, 182, 212, 0.2)";
    ctx.beginPath();
    ctx.roundRect(20, 52, 140, 26, 6);
    ctx.fill();
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = "bold 11px monospace";
    ctx.fillStyle = "#00f0ff";
    ctx.shadowBlur = 0;
    ctx.fillText(`[${status}]`, 28, 69);

    ctx.font = "11px monospace";
    ctx.fillStyle = "#f59e0b";
    ctx.fillText(occ, 175, 69);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene Setup (Void atmosphere, NO grid base)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060d);
    scene.fog = new THREE.FogExp2(0x04060d, 0.012);
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;

    const updateCameraPos = () => {
      const radius = 64 * controlsRef.current.zoom;
      camera.position.x = radius * Math.sin(controlsRef.current.rotY) * Math.cos(controlsRef.current.rotX);
      camera.position.y = radius * Math.sin(controlsRef.current.rotX);
      camera.position.z = radius * Math.cos(controlsRef.current.rotY) * Math.cos(controlsRef.current.rotX);
      camera.lookAt(0, 1.2, 0);
    };
    updateCameraPos();

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 4. Lighting (Clean sci-fi point + ambient lights)
    const ambientLight = new THREE.AmbientLight(0x1a365d, 2.0);
    scene.add(ambientLight);

    const cyanLight = new THREE.PointLight(0x00f0ff, 3.8, 120);
    cyanLight.position.set(-15, 30, 20);
    scene.add(cyanLight);

    const amberLight = new THREE.PointLight(0xf59e0b, 2.5, 100);
    amberLight.position.set(15, 25, -20);
    scene.add(amberLight);

    // 5. UNIFIED SOLID EXTERIOR FOUNDATION ENVELOPE (From reference code - replaces ugly grid!)
    const foundationGeo = new THREE.BoxGeometry(68, 0.25, 68);
    const foundationMat = new THREE.MeshPhongMaterial({
      color: 0x071526,
      opacity: 0.95,
      transparent: true,
      shininess: 80,
    });
    const foundationMesh = new THREE.Mesh(foundationGeo, foundationMat);
    foundationMesh.position.set(0, 0.1, 0);
    scene.add(foundationMesh);

    // Foundation Outer Edge Glowing Trim
    const foundationEdge = new THREE.EdgesGeometry(foundationGeo);
    const foundationLine = new THREE.LineSegments(
      foundationEdge,
      new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 })
    );
    foundationLine.position.set(0, 0.1, 0);
    scene.add(foundationLine);

    // Groups
    const labelsGroup = new THREE.Group();
    labelsGroupRef.current = labelsGroup;
    scene.add(labelsGroup);

    const vfxGroup = new THREE.Group();
    vfxGroupRef.current = vfxGroup;
    scene.add(vfxGroup);

    const pingsGroup = new THREE.Group();
    pingsGroupRef.current = pingsGroup;
    scene.add(pingsGroup);

    // 6. BUILD OAKHAVEN ROOM COMPARTMENTS & ARCHITECTURAL STRUCTURE
    const roomMeshes: Record<string, { mesh: THREE.Mesh; line: THREE.LineSegments; floor: THREE.Mesh }> = {};

    OAKHAVEN_SECTORS.forEach((sec) => {
      const isDome = sec.shape === "circle";
      const roomGroup = new THREE.Group();
      roomGroup.position.set(sec.x, 0, sec.z);

      const height = sec.type === "corridor" ? 2.4 : 3.4;
      let geom: THREE.BufferGeometry;

      if (isDome) {
        geom = new THREE.CylinderGeometry(sec.radius || 6, sec.radius || 6, height, 32);
      } else if (sec.shape === "pentagon") {
        geom = new THREE.CylinderGeometry(sec.width / 2, sec.width / 2, height, 5);
      } else if (sec.shape === "octagon") {
        geom = new THREE.CylinderGeometry(sec.width / 2, sec.width / 2, height, 8);
      } else {
        geom = new THREE.BoxGeometry(sec.width, height, sec.depth);
      }

      // Translucent Glassmorphic Room Wall
      const wallMat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(sec.wallColor),
        transparent: true,
        opacity: 0.24,
        shininess: 90,
        side: THREE.DoubleSide,
      });

      const wallMesh = new THREE.Mesh(geom, wallMat);
      wallMesh.position.y = height / 2;
      wallMesh.userData = { sectorId: sec.id };
      roomGroup.add(wallMesh);

      // Neon Line Edges for Partition Wall Frames
      const edgesGeo = new THREE.EdgesGeometry(geom);
      const edgesMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(sec.wallColor),
        linewidth: 1.5,
      });
      const lineSegments = new THREE.LineSegments(edgesGeo, edgesMat);
      lineSegments.position.y = height / 2;
      roomGroup.add(lineSegments);

      // Shared Floor Tile Panel
      let floorGeo: THREE.BufferGeometry;
      if (isDome) {
        floorGeo = new THREE.CircleGeometry((sec.radius || 6) - 0.1, 32);
      } else {
        floorGeo = new THREE.PlaneGeometry(sec.width - 0.15, sec.depth - 0.15);
      }
      const floorMat = new THREE.MeshBasicMaterial({
        color: 0x0a2540,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = Math.PI / 2;
      floorMesh.position.y = 0.24;
      roomGroup.add(floorMesh);

      scene.add(roomGroup);

      // Billboarded Holographic Telemetry Label Card (From reference code)
      const occText = tokens.filter((t) => t.sectorId === sec.id).map((t) => t.name).join(", ") || "UNOCCUPIED";
      const icon = isDome ? "🏛️" : sec.type === "vault" ? "🔒" : sec.type === "medical" ? "🩺" : "🏢";
      const labelTexture = createLabelTexture(sec.name, icon, sec.riskLevel, occText, sec.wallColor);
      const spriteMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true, opacity: 0.95 });
      const labelSprite = new THREE.Sprite(spriteMat);
      labelSprite.scale.set(7.5, 2.0, 1);
      labelSprite.position.set(sec.x, height + 2.2, sec.z);
      labelsGroup.add(labelSprite);

      roomMeshes[sec.id] = { mesh: wallMesh, line: lineSegments, floor: floorMesh };

      // Doors as Glowing Archways
      sec.doors.forEach((door) => {
        const archGeo = new THREE.BoxGeometry(1.8, 2.4, 0.35);
        const archMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(door.isLocked ? "#ef4444" : "#00f0ff"),
          wireframe: true,
          transparent: true,
          opacity: 0.75,
        });
        const archMesh = new THREE.Mesh(archGeo, archMat);
        archMesh.position.set(door.x, 1.2, door.z);
        scene.add(archMesh);
      });
    });

    roomMeshesRef.current = roomMeshes;

    // 7. INFECTED AGENTS INSIDE CENTRAL DOME (User requirement: show infected people in center dome)
    for (let i = 0; i < 3; i++) {
      const infGeo = new THREE.SphereGeometry(0.55, 12, 12);
      const infMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xef4444),
        emissive: new THREE.Color(0xef4444),
        emissiveIntensity: 1.2,
        roughness: 0.2,
      });
      const infMesh = new THREE.Mesh(infGeo, infMat);
      const angle = (i / 3) * Math.PI * 2;
      infMesh.position.set(Math.cos(angle) * 3.0, 0.9, Math.sin(angle) * 3.0);
      infMesh.userData = { isInfected: true };
      scene.add(infMesh);
    }

    // 8. Mouse & Pointer Controls
    const onPointerDown = (e: MouseEvent) => {
      if (e.target !== renderer.domElement) return;
      controlsRef.current.isDragging = true;
      controlsRef.current.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: MouseEvent) => {
      if (!controlsRef.current.isDragging) return;
      const deltaX = e.clientX - controlsRef.current.previousMousePosition.x;
      const deltaY = e.clientY - controlsRef.current.previousMousePosition.y;

      controlsRef.current.rotY -= deltaX * 0.005;
      controlsRef.current.rotX = Math.max(0.12, Math.min(Math.PI / 2.2, controlsRef.current.rotX + deltaY * 0.005));

      controlsRef.current.previousMousePosition = { x: e.clientX, y: e.clientY };
      updateCameraPos();
    };

    const onPointerUp = () => {
      controlsRef.current.isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      controlsRef.current.zoom = Math.max(0.4, Math.min(2.4, controlsRef.current.zoom + e.deltaY * 0.001));
      updateCameraPos();
    };

    // Raycast click room targeting
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      if (e.target !== renderer.domElement) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshesToIntersect = Object.values(roomMeshesRef.current).map((r) => r.mesh);
      const intersects = raycaster.intersectObjects(meshesToIntersect);

      if (intersects.length > 0) {
        const hitSecId = intersects[0].object.userData.sectorId;
        if (hitSecId) {
          onSelectSector(hitSecId);
        }
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    domEl.addEventListener("wheel", onWheel, { passive: false });
    domEl.addEventListener("click", onClick);

    // 9. Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (autoRotateCamera && !controlsRef.current.isDragging) {
        controlsRef.current.rotY += 0.0035;
        updateCameraPos();
      }

      // Billboard labels face camera
      if (labelsGroupRef.current) {
        labelsGroupRef.current.children.forEach((sprite) => {
          sprite.quaternion.copy(camera.quaternion);
        });
      }

      // Pulsate infected bio-hazard nodes
      scene.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.userData.isInfected) {
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 0.8 + Math.sin(elapsed * 4) * 0.6;
          child.scale.setScalar(1 + Math.sin(elapsed * 3) * 0.12);
        }
      });

      // Float tokens slightly
      tokenMeshesRef.current.forEach((tGroup, idx) => {
        tGroup.position.y = 1.2 + Math.sin(elapsed * 3 + idx) * 0.15;
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
      domEl.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      domEl.removeEventListener("wheel", onWheel);
      domEl.removeEventListener("click", onClick);
      renderer.dispose();
    };
  }, [onSelectSector, autoRotateCamera]);

  // Update Sector Highlights
  useEffect(() => {
    Object.entries(roomMeshesRef.current).forEach(([secId, { mesh, line }]) => {
      const isSelected = secId === selectedSectorId;
      const mat = mesh.material as THREE.MeshPhongMaterial;
      const lineMat = line.material as THREE.LineBasicMaterial;

      if (isSelected) {
        mat.opacity = 0.55;
        mat.emissive = new THREE.Color(0x00f0ff);
        lineMat.color.setHex(0x00f0ff);
      } else {
        mat.opacity = 0.22;
        mat.emissive = new THREE.Color(0x000000);
      }
    });
  }, [selectedSectorId]);

  // Update Anonymous Operative Tokens on Map
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    tokenMeshesRef.current.forEach((t) => scene.remove(t));
    tokenMeshesRef.current = [];

    tokens.forEach((tok) => {
      const sector = OAKHAVEN_SECTORS.find((s) => s.id === tok.sectorId);
      if (!sector) return;

      const group = new THREE.Group();

      // Holographic Operative Avatar Sphere / Cylinder
      const tokenGeo = new THREE.SphereGeometry(1.0, 16, 16);
      const tokenMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(tok.color),
        emissive: new THREE.Color(tok.color),
        emissiveIntensity: 0.9,
        roughness: 0.2,
        metalness: 0.8,
      });
      const mesh = new THREE.Mesh(tokenGeo, tokenMat);
      group.add(mesh);

      // Pulsing Ground Ring
      const ringGeo = new THREE.RingGeometry(1.2, 1.6, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(tok.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = -0.9;
      group.add(ringMesh);

      const jitterX = (Math.random() - 0.5) * (sector.width * 0.35);
      const jitterZ = (Math.random() - 0.5) * (sector.depth * 0.35);

      group.position.set(sector.x + jitterX, 1.2, sector.z + jitterZ);
      scene.add(group);
      tokenMeshesRef.current.push(group);
    });
  }, [tokens]);

  // Camera Presets (From Visual Reference)
  const setPresetView = (preset: "ISOMETRIC" | "TOP" | "FRONT") => {
    setCameraPreset(preset);
    if (preset === "ISOMETRIC") {
      controlsRef.current.rotX = 0.65;
      controlsRef.current.rotY = -0.5;
      controlsRef.current.zoom = 1.0;
    } else if (preset === "TOP") {
      controlsRef.current.rotX = 1.52;
      controlsRef.current.rotY = 0;
      controlsRef.current.zoom = 0.95;
    } else if (preset === "FRONT") {
      controlsRef.current.rotX = 0.15;
      controlsRef.current.rotY = 0;
      controlsRef.current.zoom = 1.0;
    }

    if (cameraRef.current) {
      const radius = 64 * controlsRef.current.zoom;
      cameraRef.current.position.x = radius * Math.sin(controlsRef.current.rotY) * Math.cos(controlsRef.current.rotX);
      cameraRef.current.position.y = radius * Math.sin(controlsRef.current.rotX);
      cameraRef.current.position.z = radius * Math.cos(controlsRef.current.rotY) * Math.cos(controlsRef.current.rotX);
      cameraRef.current.lookAt(0, 1.2, 0);
    }
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden rounded-2xl border border-cyan-500/40 bg-slate-950/90 shadow-2xl">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Header HUD Overlays (From reference visual design) */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center z-20 pointer-events-none">
        <div className="px-3 py-1 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-xs font-bold text-cyan-300 flex items-center gap-2 pointer-events-auto backdrop-blur-md">
          <Crosshair className="w-4 h-4 text-amber-400 animate-spin" />
          <span>OAKHAVEN FACILITY (HOLOGRAM INTEL)</span>
        </div>

        {/* Camera View Controls (ISOMETRIC / TOP / FRONT + Auto-Rotate) */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {(["ISOMETRIC", "TOP", "FRONT"] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => setPresetView(preset)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                cameraPreset === preset
                  ? "bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                  : "bg-slate-900/90 text-cyan-300 border-cyan-500/40 hover:bg-slate-800"
              }`}
            >
              {preset}
            </button>
          ))}
          <button
            onClick={() => setAutoRotateCamera((prev) => !prev)}
            className={`p-1.5 rounded-lg border transition ${
              autoRotateCamera
                ? "bg-cyan-500 text-slate-950 border-cyan-300"
                : "bg-slate-900/90 text-cyan-300 border-cyan-500/40"
            }`}
            title="Toggle Auto Rotate"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active Sector badge at bottom right */}
      <div className="absolute bottom-2.5 right-2.5 p-2 rounded-xl bg-slate-900/90 border border-cyan-500/50 text-xs font-mono flex items-center gap-2.5 z-20 backdrop-blur-md">
        <span className="text-amber-400 font-bold">ACTIVE SECTOR:</span>
        <span className="text-white font-bold">
          {OAKHAVEN_SECTORS.find((s) => s.id === selectedSectorId)?.name || selectedSectorId}
        </span>
      </div>

      {/* Infected in Dome status indicator */}
      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/90 border border-rose-500/60 backdrop-blur-md text-[11px] font-bold text-rose-300 z-10 animate-pulse">
        <span className="w-2 h-2 rounded-full bg-rose-500" />
        <span>⚠ 3 INFECTED IN LOCKDOWN DOME</span>
      </div>
    </div>
  );
};
