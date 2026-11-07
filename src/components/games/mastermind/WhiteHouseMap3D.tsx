"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { WHITE_HOUSE_SECTORS, RoomSector } from "./whiteHouseData";

export interface PlayerToken {
  id: string;
  name: string;
  role: string;
  sectorId: string;
  color: string;
  isMe?: boolean;
  health: 'healthy' | 'wounded' | 'dead';
  hasShield?: boolean;
}

interface WhiteHouseMap3DProps {
  selectedSectorId: string;
  onSelectSector: (sectorId: string) => void;
  playerTokens: PlayerToken[];
  myLoSSectors: string[]; // Sector IDs currently visible
  noisePings?: { sectorId: string; timestamp: number }[]; // Gunfire / hack noise events
  lockedDoors?: string[];
}

export const WhiteHouseMap3D: React.FC<WhiteHouseMap3DProps> = ({
  selectedSectorId,
  onSelectSector,
  playerTokens,
  myLoSSectors,
  noisePings = [],
  lockedDoors = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Orbit state
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraAnglesRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 3, radius: 65 });
  const targetLookAtRef = useRef(new THREE.Vector3(2, 0, -5));

  // Raycasting for clicking sectors
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const roomMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const tokenMeshesRef = useRef<Map<string, THREE.Group>>(new Map());

  // Camera preset controls
  const [zoomLevel, setZoomLevel] = useState(1);

  // Update camera spherical position
  const updateCameraPosition = useCallback(() => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraAnglesRef.current;
    const clampedPhi = Math.max(0.15, Math.min(Math.PI / 2.1, phi));
    cameraAnglesRef.current.phi = clampedPhi;

    const x = targetLookAtRef.current.x + radius * Math.sin(clampedPhi) * Math.sin(theta);
    const y = targetLookAtRef.current.y + radius * Math.cos(clampedPhi);
    const z = targetLookAtRef.current.z + radius * Math.sin(clampedPhi) * Math.cos(theta);

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(targetLookAtRef.current);
  }, []);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060913); // Deep dark cyber blue
    scene.fog = new THREE.FogExp2(0x060913, 0.012);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.5,
      500
    );
    cameraRef.current = camera;
    updateCameraPosition();

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Ambient & Directional Cyberpunk Lighting
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const redAccent = new THREE.PointLight(0xf43f5e, 2.5, 80);
    redAccent.position.set(-15, 8, -15);
    scene.add(redAccent);

    const cyanAccent = new THREE.PointLight(0x06b6d4, 2.5, 80);
    cyanAccent.position.set(15, 8, 5);
    scene.add(cyanAccent);

    // Global Sub-Floor Cyber Grid
    const gridHelper = new THREE.GridHelper(120, 60, 0x0ea5e9, 0x1e293b);
    gridHelper.position.y = -0.6;
    scene.add(gridHelper);

    // Construct White House Architectural Sectors
    const roomMeshes = new Map<string, THREE.Mesh>();
    roomMeshesRef.current = roomMeshes;

    WHITE_HOUSE_SECTORS.forEach((sector) => {
      // 1. Room Floor Plate
      const floorGeo = new THREE.BoxGeometry(sector.width, 0.6, sector.depth);
      const floorMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(sector.color).multiplyScalar(0.25),
        roughness: 0.2,
        metalness: 0.8,
        transparent: true,
        opacity: 0.9,
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.set(sector.x, -0.3, sector.z);
      floorMesh.userData = { sectorId: sector.id, sectorName: sector.name };
      scene.add(floorMesh);
      roomMeshes.set(sector.id, floorMesh);

      // 2. Neon Boundary Outline
      const edges = new THREE.EdgesGeometry(floorGeo);
      const lineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(sector.color),
        linewidth: 2,
        transparent: true,
        opacity: 0.8,
      });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      floorMesh.add(wireframe);

      // 3. Security Level Beacons & Terminals
      if (sector.hasTerminal) {
        const termGeo = new THREE.CylinderGeometry(0.5, 0.7, 1.2, 8);
        const termMat = new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          emissive: 0x0284c7,
          emissiveIntensity: 0.6,
          roughness: 0.3,
        });
        const termMesh = new THREE.Mesh(termGeo, termMat);
        termMesh.position.set(sector.x, 0.6, sector.z);
        scene.add(termMesh);
      }

      // 4. Surveillance Camera Feeds (Scanning Cones)
      if (sector.hasCamera) {
        const camGeo = new THREE.ConeGeometry(sector.width * 0.35, 3.5, 12, 1, true);
        const camMat = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.12,
          side: THREE.DoubleSide,
        });
        const camCone = new THREE.Mesh(camGeo, camMat);
        camCone.position.set(sector.x + sector.width * 0.35, 3.0, sector.z - sector.depth * 0.35);
        camCone.rotation.x = Math.PI;
        camCone.rotation.z = Math.PI / 6;
        scene.add(camCone);
      }
    });

    // Corridor Connection Lines between rooms
    const lineMat = new THREE.LineDashedMaterial({
      color: 0x475569,
      dashSize: 1.5,
      gapSize: 0.8,
      transparent: true,
      opacity: 0.5,
    });

    WHITE_HOUSE_SECTORS.forEach((sector) => {
      sector.connectedRoomIds.forEach((targetId) => {
        const target = WHITE_HOUSE_SECTORS.find((s) => s.id === targetId);
        if (target && sector.id < targetId) {
          const points = [
            new THREE.Vector3(sector.x, 0.05, sector.z),
            new THREE.Vector3(target.x, 0.05, target.z),
          ];
          const pathGeo = new THREE.BufferGeometry().setFromPoints(points);
          const pathLine = new THREE.Line(pathGeo, lineMat);
          pathLine.computeLineDistances();
          scene.add(pathLine);
        }
      });
    });

    // Animation Loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Pulse selected room
      if (selectedSectorId && roomMeshes.has(selectedSectorId)) {
        const mesh = roomMeshes.get(selectedSectorId)!;
        const pulse = 1.0 + Math.sin(Date.now() * 0.006) * 0.2;
        mesh.scale.set(pulse, 1, pulse);
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, [updateCameraPosition, selectedSectorId]);

  // Update Player / Bot Hologram Tokens on Map
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const tokenMeshes = tokenMeshesRef.current;

    // Remove tokens not in playerTokens list
    for (const [id, grp] of tokenMeshes.entries()) {
      if (!playerTokens.find((p) => p.id === id)) {
        scene.remove(grp);
        tokenMeshes.delete(id);
      }
    }

    // Add or update tokens
    playerTokens.forEach((p, idx) => {
      const sector = WHITE_HOUSE_SECTORS.find((s) => s.id === p.sectorId);
      if (!sector) return;

      let grp = tokenMeshes.get(p.id);
      if (!grp) {
        grp = new THREE.Group();

        // 1. Holographic Character Cylinder Beacon
        const bodyGeo = new THREE.CylinderGeometry(0.7, 0.85, 2.2, 16);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(p.color || (p.isMe ? "#06b6d4" : "#ec4899")),
          emissive: new THREE.Color(p.color || (p.isMe ? "#06b6d4" : "#ec4899")),
          emissiveIntensity: 0.6,
          metalness: 0.8,
          roughness: 0.2,
        });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = 1.1;
        grp.add(bodyMesh);

        // 2. Pulsing Base Ring
        const ringGeo = new THREE.RingGeometry(0.9, 1.4, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(p.color || "#06b6d4"),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.y = 0.05;
        grp.add(ringMesh);

        scene.add(grp);
        tokenMeshes.set(p.id, grp);
      }

      // Stagger token positions within the same room so they don't overlap
      const offsetAngle = (idx * (Math.PI * 2)) / Math.max(1, playerTokens.length);
      const offsetX = Math.cos(offsetAngle) * 1.8;
      const offsetZ = Math.sin(offsetAngle) * 1.8;

      grp.position.set(sector.x + offsetX, 0, sector.z + offsetZ);
    });
  }, [playerTokens]);

  // Update Fog of War / Line of Sight and Selected Sector Materials
  useEffect(() => {
    const roomMeshes = roomMeshesRef.current;
    if (!roomMeshes) return;

    WHITE_HOUSE_SECTORS.forEach((sec) => {
      const mesh = roomMeshes.get(sec.id);
      if (!mesh) return;

      const isSelected = sec.id === selectedSectorId;
      const inLoS = myLoSSectors.includes(sec.id);
      const isLocked = lockedDoors.includes(sec.id);

      const mat = mesh.material as THREE.MeshStandardMaterial;

      if (isSelected) {
        mat.color = new THREE.Color(0xf59e0b); // Bright Amber Selected
        mat.emissive = new THREE.Color(0xd97706);
        mat.emissiveIntensity = 0.8;
        mat.opacity = 1.0;
      } else if (isLocked) {
        mat.color = new THREE.Color(0xef4444); // Red Locked
        mat.emissive = new THREE.Color(0xb91c1c);
        mat.emissiveIntensity = 0.5;
        mat.opacity = 0.95;
      } else if (inLoS) {
        mat.color = new THREE.Color(sec.color).multiplyScalar(0.4);
        mat.emissive = new THREE.Color(sec.color);
        mat.emissiveIntensity = 0.3;
        mat.opacity = 0.9;
      } else {
        // Dimmed in Fog of War
        mat.color = new THREE.Color(0x0f172a);
        mat.emissive = new THREE.Color(0x000000);
        mat.emissiveIntensity = 0;
        mat.opacity = 0.35;
      }
    });
  }, [selectedSectorId, myLoSSectors, lockedDoors]);

  // Mouse & Touch Controls (Orbit, Pan, Sector Click)
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    if (e.buttons === 1) {
      // Left click drag: Orbit Pan & Tilt
      cameraAnglesRef.current.theta -= deltaX * 0.007;
      cameraAnglesRef.current.phi -= deltaY * 0.007;
      updateCameraPosition();
    } else if (e.buttons === 2 || e.buttons === 4) {
      // Right or middle click drag: Camera Translate
      targetLookAtRef.current.x -= deltaX * 0.04;
      targetLookAtRef.current.z -= deltaY * 0.04;
      updateCameraPosition();
    }

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;

    // Raycast on click
    const container = containerRef.current;
    if (!container || !cameraRef.current || !sceneRef.current) return;

    const rect = container.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const meshes = Array.from(roomMeshesRef.current.values());
    const intersects = raycasterRef.current.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hitSectorId = intersects[0].object.userData.sectorId;
      if (hitSectorId) {
        onSelectSector(hitSectorId);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.04;
    cameraAnglesRef.current.radius = Math.max(25, Math.min(120, cameraAnglesRef.current.radius + zoomDelta));
    updateCameraPosition();
    setZoomLevel(Math.round((65 / cameraAnglesRef.current.radius) * 100) / 100);
  };

  const resetCameraView = () => {
    cameraAnglesRef.current = { theta: Math.PI / 4, phi: Math.PI / 3, radius: 65 };
    targetLookAtRef.current.set(2, 0, -5);
    updateCameraPosition();
  };

  return (
    <div className="relative w-full h-full bg-[#060913] rounded-2xl overflow-hidden select-none border border-slate-800/80 shadow-2xl">
      {/* 3D Canvas Mount Point */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Floating 3D Camera & Viewport Toolbar */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-800/90 text-xs text-slate-300 shadow-xl z-20">
        <span className="font-mono text-[10px] text-cyan-400 font-bold">3D {zoomLevel}x</span>
        <button
          type="button"
          onClick={() => {
            cameraAnglesRef.current.theta += Math.PI / 6;
            updateCameraPosition();
          }}
          className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
          title="Rotate 30°"
        >
          ↻ 30°
        </button>
        <button
          type="button"
          onClick={resetCameraView}
          className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
          title="Reset Camera View"
        >
          Reset
        </button>
      </div>

      {/* Noise Pings Indicator Overlay (Ballistic Intel) */}
      {noisePings.length > 0 && (
        <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-bold animate-pulse z-20">
          <span>⚠️ Ballistic Noise Detected in White House Grid!</span>
        </div>
      )}
    </div>
  );
};

