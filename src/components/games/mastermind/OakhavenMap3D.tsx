"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OAKHAVEN_SECTORS, SectorDef } from "./oakhavenMapData";

export interface OperativeToken {
  id: string;
  name: string; // Anonymous alias
  avatar: string;
  color: string;
  sectorId: string;
  isMe?: boolean;
  activity?: string; // e.g., 'breaching', 'healing', 'investigating'
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
  const sectorMeshesRef = useRef<Record<string, THREE.Mesh>>({});
  const tokenMeshesRef = useRef<THREE.Group[]>([]);
  const pingsGroupRef = useRef<THREE.Group | null>(null);

  // Orbit controls state
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 3, radius: 68 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913); // Cyberpunk deep space void
    scene.fog = new THREE.FogExp2(0x060913, 0.009);
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;

    const updateCameraPos = () => {
      const { theta, phi, radius } = cameraAngleRef.current;
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, 0, 0);
    };
    updateCameraPos();

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(30, 50, 30);
    scene.add(mainLight);

    const blueSubLight = new THREE.DirectionalLight(0x0284c7, 0.8);
    blueSubLight.position.set(-30, 40, -30);
    scene.add(blueSubLight);

    // 5. Holographic Floor Grid
    const gridHelper = new THREE.GridHelper(90, 45, 0x0ea5e9, 0x1e293b);
    gridHelper.position.y = -0.05;
    scene.add(gridHelper);

    // 6. Build Shelter Architecture from Oakhaven Layout
    const sectorMeshes: Record<string, THREE.Mesh> = {};

    OAKHAVEN_SECTORS.forEach((sec) => {
      const isDome = sec.shape === "circle";
      const wallThickness = 0.7; // Thick physical walls as requested!
      const wallHeight = 3.5;

      // Sector Floor
      let floorGeo: THREE.BufferGeometry;
      if (isDome) {
        floorGeo = new THREE.CylinderGeometry(sec.radius || 5, sec.radius || 5, 0.2, 32);
      } else if (sec.shape === "pentagon") {
        floorGeo = new THREE.CylinderGeometry(sec.width / 2, sec.width / 2, 0.2, 5);
      } else if (sec.shape === "octagon") {
        floorGeo = new THREE.CylinderGeometry(sec.width / 2, sec.width / 2, 0.2, 8);
      } else {
        floorGeo = new THREE.BoxGeometry(sec.width, 0.2, sec.depth);
      }

      const floorMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(sec.floorColor),
        roughness: 0.4,
        metalness: 0.6,
      });

      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.set(sec.x, 0, sec.z);
      floorMesh.userData = { sectorId: sec.id, isFloor: true };
      scene.add(floorMesh);
      sectorMeshes[sec.id] = floorMesh;

      // Sector Thick Walls
      if (sec.type !== "corridor") {
        if (isDome) {
          // Circular Wall Tube
          const wallGeo = new THREE.CylinderGeometry(
            sec.radius || 5,
            sec.radius || 5,
            wallHeight,
            32,
            1,
            true
          );
          const wallMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(sec.wallColor),
            roughness: 0.2,
            metalness: 0.8,
            side: THREE.DoubleSide,
            wireframe: false,
          });
          const wallMesh = new THREE.Mesh(wallGeo, wallMat);
          wallMesh.position.set(sec.x, wallHeight / 2, sec.z);
          scene.add(wallMesh);
        } else {
          // Box Perimeter Walls
          const halfW = sec.width / 2;
          const halfD = sec.depth / 2;

          // 4 Thick Wall Slabs
          const createWallSlab = (w: number, d: number, px: number, pz: number) => {
            const slabGeo = new THREE.BoxGeometry(w, wallHeight, d);
            const slabMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(sec.wallColor),
              roughness: 0.3,
              metalness: 0.7,
            });
            const slab = new THREE.Mesh(slabGeo, slabMat);
            slab.position.set(sec.x + px, wallHeight / 2, sec.z + pz);
            scene.add(slab);
          };

          createWallSlab(sec.width, wallThickness, 0, -halfD);
          createWallSlab(sec.width, wallThickness, 0, halfD);
          createWallSlab(wallThickness, sec.depth, -halfW, 0);
          createWallSlab(wallThickness, sec.depth, halfW, 0);
        }
      }

      // Creative Roofs (Domes, Chamfers, Holographic Wireframe Caps)
      if (sec.roofType === "dome") {
        // High Hemispherical Dome Roof
        const domeGeo = new THREE.SphereGeometry(
          sec.radius || 6,
          24,
          16,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2
        );
        const domeMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(sec.wallColor),
          roughness: 0.1,
          metalness: 0.9,
          transparent: true,
          opacity: 0.45,
          wireframe: true,
        });
        const domeMesh = new THREE.Mesh(domeGeo, domeMat);
        domeMesh.position.set(sec.x, wallHeight, sec.z);
        scene.add(domeMesh);
      } else if (sec.roofType === "chamfer") {
        const capGeo = new THREE.ConeGeometry((sec.width || 6) * 0.65, 2.5, 8);
        const capMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(sec.wallColor),
          transparent: true,
          opacity: 0.35,
          wireframe: true,
        });
        const capMesh = new THREE.Mesh(capGeo, capMat);
        capMesh.position.set(sec.x, wallHeight + 1.25, sec.z);
        scene.add(capMesh);
      }

      // Doors (Red for Locked Security Gates, Grey/Cyan for Standard Doors)
      sec.doors.forEach((door) => {
        const doorGeo = new THREE.BoxGeometry(1.8, 2.8, 0.4);
        const doorMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(door.isLocked ? "#ef4444" : "#94a3b8"),
          emissive: new THREE.Color(door.isLocked ? "#ef4444" : "#0284c7"),
          emissiveIntensity: door.isLocked ? 0.8 : 0.2,
          roughness: 0.2,
        });
        const doorMesh = new THREE.Mesh(doorGeo, doorMat);
        doorMesh.position.set(door.x, 1.4, door.z);
        scene.add(doorMesh);
      });
    });

    sectorMeshesRef.current = sectorMeshes;

    // 7. Group for Dynamic Noise / Emergency Pings
    const pingsGroup = new THREE.Group();
    scene.add(pingsGroup);
    pingsGroupRef.current = pingsGroup;

    // 8. Mouse & Orbit Interaction
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      cameraAngleRef.current.theta -= deltaX * 0.007;
      cameraAngleRef.current.phi = Math.max(
        0.15,
        Math.min(Math.PI / 2.1, cameraAngleRef.current.phi - deltaY * 0.007)
      );

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      updateCameraPos();
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraAngleRef.current.radius = Math.max(
        25,
        Math.min(120, cameraAngleRef.current.radius + e.deltaY * 0.05)
      );
      updateCameraPos();
    };

    // Raycast Click Selection
    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseVec, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      for (const hit of intersects) {
        if (hit.object.userData && hit.object.userData.sectorId) {
          onSelectSector(hit.object.userData.sectorId);
          break;
        }
      }
    };

    const domElement = renderer.domElement;
    domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    domElement.addEventListener("wheel", onWheel, { passive: false });
    domElement.addEventListener("click", onClick);

    // 9. Render Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Pulsate noise / alarm pings
      if (pingsGroupRef.current) {
        pingsGroupRef.current.children.forEach((child) => {
          const s = 1 + (Math.sin(elapsed * 4) + 1) * 0.3;
          child.scale.set(s, 1, s);
        });
      }

      // Float tokens slightly
      tokenMeshesRef.current.forEach((tGroup, idx) => {
        tGroup.position.y = 1.2 + Math.sin(elapsed * 3 + idx) * 0.15;
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const nw = mountRef.current.clientWidth;
      const nh = mountRef.current.clientHeight;
      cameraRef.current.aspect = nw / nh;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(nw, nh);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      domElement.removeEventListener("wheel", onWheel);
      domElement.removeEventListener("click", onClick);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, [onSelectSector]);

  // Update Sector Highlights
  useEffect(() => {
    Object.entries(sectorMeshesRef.current).forEach(([secId, mesh]) => {
      const isSelected = secId === selectedSectorId;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (isSelected) {
        mat.emissive = new THREE.Color(0x38bdf8);
        mat.emissiveIntensity = 0.6;
      } else {
        mat.emissive = new THREE.Color(0x000000);
        mat.emissiveIntensity = 0;
      }
    });
  }, [selectedSectorId]);

  // Update Anonymous Operative Tokens on Map
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clean previous token meshes
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
        emissiveIntensity: 0.8,
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
        opacity: 0.6,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = -1.0;
      group.add(ringMesh);

      // Random jitter within sector for multiple players
      const jitterX = (Math.random() - 0.5) * (sector.width * 0.4);
      const jitterZ = (Math.random() - 0.5) * (sector.depth * 0.4);

      group.position.set(sector.x + jitterX, 1.2, sector.z + jitterZ);
      scene.add(group);
      tokenMeshesRef.current.push(group);
    });
  }, [tokens]);

  // Update Noise / Alert Pings
  useEffect(() => {
    const pGroup = pingsGroupRef.current;
    if (!pGroup) return;

    while (pGroup.children.length > 0) {
      pGroup.remove(pGroup.children[0]);
    }

    noisePings.forEach((ping) => {
      const sector = OAKHAVEN_SECTORS.find((s) => s.id === ping.sectorId);
      if (!sector) return;

      const pingGeo = new THREE.RingGeometry(2, 2.5, 32);
      const pingMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xf43f5e),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const pingMesh = new THREE.Mesh(pingGeo, pingMat);
      pingMesh.rotation.x = Math.PI / 2;
      pingMesh.position.set(sector.x, 0.4, sector.z);
      pGroup.add(pingMesh);
    });
  }, [noisePings]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-950/80 shadow-2xl shadow-cyan-950/40">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Holographic HUD Overlays */}
      <div className="absolute top-3 left-3 pointer-events-none flex flex-col gap-1 z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 backdrop-blur-md">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-black tracking-widest text-cyan-300 uppercase">
            Oakhaven 3D Holographic Facility Grid
          </span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono px-1">
          L-Click + Drag: 360° Orbit • Scroll: Zoom • Click Room: Inspect Sector
        </div>
      </div>

      {/* Vault Status Badges */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 pointer-events-none">
        {["vault_1", "vault_2", "vault_3", "vault_4"].map((vId, idx) => {
          const isBreached = vaultBreaches[vId];
          return (
            <div
              key={vId}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider border backdrop-blur-md flex items-center gap-1.5 ${
                isBreached
                  ? "bg-rose-950/80 border-rose-500/60 text-rose-300 animate-pulse"
                  : "bg-slate-900/80 border-slate-700/60 text-slate-300"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isBreached ? "bg-rose-400" : "bg-emerald-400"}`} />
              <span>V{idx + 1} {isBreached ? "BREACHED" : "LOCKED"}</span>
            </div>
          );
        })}
      </div>

      {/* Center Dome Fortification Badge */}
      {isFortified && (
        <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-blue-950/90 border border-blue-500/60 backdrop-blur-md flex items-center gap-2 text-xs font-bold text-blue-300 z-10">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span>Central Dome: Fortified Lockdown Active</span>
        </div>
      )}
    </div>
  );
};

