"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Clock,
  Trophy,
  ArrowLeft,
  Sparkles,
  Image as ImageIcon,
  HelpCircle,
  Search,
  Eraser,
  Undo,
  Redo,
  Check,
  RotateCcw,
  Wand2,
  Maximize2,
  Palette,
  Crosshair,
  PenTool,
} from "lucide-react";
import confetti from "canvas-confetti";
import { RoomState } from "../../../../party/types";

interface MysteryGameProps {
  roomState: RoomState;
  myId: string;
  onSetImage: (
    imageUrl: string,
    answer: string,
    category: string,
    filterMode: "silhouette" | "tiles" | "custom_blackout",
    blackoutDataUrl?: string,
    bgColor?: string
  ) => void;
  onRevealTile: (tileIndex: number) => void;
  onReturnToLobby: () => void;
}

// Categorized Word Prompts
const WORD_SUGGESTIONS: Record<string, string[]> = {
  "🎮 Gaming": [
    "Pikachu",
    "Super Mario",
    "Sonic The Hedgehog",
    "Master Chief",
    "Pac-Man",
    "Minecraft Creeper",
    "Kratos",
    "Charizard",
    "Donkey Kong",
  ],
  "🏷️ Famous Logos": [
    "Apple",
    "Nike",
    "McDonald's",
    "Starbucks",
    "Tesla",
    "Twitter",
    "Pepsi",
    "Ferrari",
    "Adidas",
  ],
  "🦸 Superheroes & Movies": [
    "Spider-Man",
    "Batman",
    "Iron Man",
    "Darth Vader",
    "Shrek",
    "Harry Potter",
    "Goku",
    "SpongeBob",
    "Joker",
  ],
  "🦁 Animals & Wonders": [
    "Eiffel Tower",
    "Statue of Liberty",
    "Tyrannosaurus Rex",
    "Kangaroo",
    "Penguin",
    "Great White Shark",
    "Golden Gate Bridge",
  ],
};

// Curated instant image library for the in-app browser
const CURATED_IMAGE_DATABASE: Record<string, string> = {
  "pikachu": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
  "charizard": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png",
  "super mario": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a9/MarioNSMBUDeluxe.png/220px-MarioNSMBUDeluxe.png",
  "sonic the hedgehog": "https://upload.wikimedia.org/wikipedia/en/thumb/2/2d/Sonic_the_Hedgehog_2019.png/220px-Sonic_the_Hedgehog_2019.png",
  "pac-man": "https://upload.wikimedia.org/wikipedia/en/b/b5/Pac-Man_%28character%29.png",
  "minecraft creeper": "https://upload.wikimedia.org/wikipedia/en/thumb/4/42/Minecraft_Creeper.png/220px-Minecraft_Creeper.png",
  "apple": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/200px-Apple_logo_black.svg.png",
  "nike": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/250px-Logo_NIKE.svg.png",
  "mcdonald's": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/McDonald%27s_Golden_Arches.svg/200px-McDonald%27s_Golden_Arches.svg.png",
  "twitter": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Logo_of_Twitter.svg/220px-Logo_of_Twitter.svg.png",
  "spider-man": "https://upload.wikimedia.org/wikipedia/en/2/21/Web_of_Spider-Man_Vol_1_129-1.png",
  "batman": "https://upload.wikimedia.org/wikipedia/en/c/c7/Batman_Infobox.jpg",
  "spongebob": "https://upload.wikimedia.org/wikipedia/en/thumb/3/3b/SpongeBob_SquarePants_character.svg/220px-SpongeBob_SquarePants_character.svg.png",
  "eiffel tower": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg/240px-Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg",
  "statue of liberty": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Lady_Liberty_under_a_blue_sky_%28cropped%29.jpg/240px-Lady_Liberty_under_a_blue_sky_%28cropped%29.jpg",
};

const BG_COLOR_OPTIONS = [
  { label: "White", value: "#ffffff", border: "border-slate-300" },
  { label: "Dark Slate", value: "#090d16", border: "border-slate-700" },
  { label: "Studio Gray", value: "#334155", border: "border-slate-500" },
  { label: "Neon Cyan", value: "#06b6d4", border: "border-cyan-400" },
  { label: "Hot Pink", value: "#ec4899", border: "border-pink-400" },
  { label: "Mint Green", value: "#10b981", border: "border-emerald-400" },
  { label: "Amber Gold", value: "#f59e0b", border: "border-amber-400" },
];

const BRUSH_SIZES = [
  { label: "S", size: 8 },
  { label: "M", size: 18 },
  { label: "L", size: 36 },
  { label: "XL", size: 64 },
];

const OPACITY_OPTIONS = [
  { label: "100%", value: 1.0 },
  { label: "85%", value: 0.85 },
  { label: "65%", value: 0.65 },
  { label: "45%", value: 0.45 },
];

export function MysteryGame({
  roomState,
  myId,
  onSetImage,
  onRevealTile,
  onReturnToLobby,
}: MysteryGameProps) {
  const mystery = roomState.mysteryState;
  if (!mystery) return null;

  const isHost = roomState.hostId === myId;
  const isCreator = mystery.creatorId === myId || isHost;
  const creator = roomState.players[mystery.creatorId];

  // Studio setup states (Open studio by default during selection or when toggled)
  const [studioOpen, setStudioOpen] = useState(true);
  const [selectedWord, setSelectedWord] = useState(mystery.targetAnswer || "PIKACHU");
  const [selectedCategory, setSelectedCategory] = useState(mystery.category || "🎮 Gaming");
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState(mystery.imageUrl || "");
  const [selectedBgColor, setSelectedBgColor] = useState(mystery.bgColor || "#ffffff");

  // Masking tools state
  const [activeTool, setActiveTool] = useState<"brush" | "eraser" | "lasso" | "wand">("brush");
  const [wandTolerance, setWandTolerance] = useState(32);
  const [brushSize, setBrushSize] = useState(18);
  const [maskOpacity, setMaskOpacity] = useState(1.0);

  // Polygon / Magnetic Lasso state
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>([]);
  const [lassoHoverPoint, setLassoHoverPoint] = useState<{ x: number; y: number } | null>(null);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  // Automatically load initial image onto the studio canvas so tools are immediately ready to use
  useEffect(() => {
    if (!loadedImage) {
      const srcToLoad = mystery.imageUrl || CURATED_IMAGE_DATABASE["pikachu"];
      if (srcToLoad) {
        loadImageSrc(srcToLoad);
      }
    }
  }, [mystery.imageUrl, loadedImage]);

  // Keep studio open if game enters image_select
  useEffect(() => {
    if (mystery.phase === "prep") {
      setStudioOpen(true);
    }
  }, [mystery.phase]);

  // Confetti on solve
  useEffect(() => {
    if (mystery.phase === "showcase_reveal" && mystery.guessedPlayerIds.length > 0) {
      confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } });
    }
  }, [mystery.phase, mystery.guessedPlayerIds.length]);

  // Support Ctrl+V paste directly from clipboard
  useEffect(() => {
    if (!studioOpen && mystery.phase !== "prep") return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                loadImageSrc(event.target.result as string);
              }
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isCreator, mystery.phase]);

  // Support Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Escape)
  useEffect(() => {
    if (!studioOpen && mystery.phase !== "prep") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "Escape") {
        // Cancel lasso points
        setLassoPoints([]);
        setLassoHoverPoint(null);
        clearOverlay();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreator, mystery.phase, undoStack.length, redoStack.length]);

  const pushSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack((prev) => [...prev.slice(-25), snapshot]);
    setRedoStack([]); // New action invalidates redo stack
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const currentSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newUndo = [...undoStack];
    const previousSnapshot = newUndo.pop(); // remove current

    if (previousSnapshot) {
      setRedoStack((prev) => [...prev, currentSnapshot]);
      setUndoStack(newUndo);
      const target = newUndo[newUndo.length - 1];
      if (target) {
        ctx.putImageData(target, 0, 0);
      }
    }
  }, [undoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const newRedo = [...redoStack];
    const nextSnapshot = newRedo.pop();
    if (!nextSnapshot) return;

    const currentSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack((prev) => [...prev, currentSnapshot]);
    setRedoStack(newRedo);
    ctx.putImageData(nextSnapshot, 0, 0);
  }, [redoStack]);

  const clearOverlay = () => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d");
    ctx?.clearRect(0, 0, overlay.width, overlay.height);
  };

  const loadImageSrc = (src: string) => {
    setImageUrl(src);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setLoadedImage(img);
      initCanvasWithImage(img);
    };
    img.src = src;
  };

  const initCanvasWithImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = 420;
    canvas.height = 420;
    if (overlay) {
      overlay.width = 420;
      overlay.height = 420;
    }

    ctx.clearRect(0, 0, 420, 420);

    // Center & fit image maintaining aspect ratio
    const hRatio = canvas.width / img.width;
    const vRatio = canvas.height / img.height;
    const ratio = Math.min(hRatio, vRatio, 1);
    const centerShiftX = (canvas.width - img.width * ratio) / 2;
    const centerShiftY = (canvas.height - img.height * ratio) / 2;

    ctx.drawImage(
      img,
      0,
      0,
      img.width,
      img.height,
      centerShiftX,
      centerShiftY,
      img.width * ratio,
      img.height * ratio
    );

    // Initial baseline state in undo stack
    const baseline = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack([baseline]);
    setRedoStack([]);
    setLassoPoints([]);
    clearOverlay();
  };

    // High-performance BFS flood fill from a set of seed coordinates
  const floodFillErase = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    seeds: Array<{ x: number; y: number }>,
    tolerance: number = 32
  ) => {
    let imgData: ImageData;
    try {
      imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch {
      alert("This web image is cross-origin protected. Tip: Copy the image and press Ctrl+V to paste directly!");
      return;
    }

    const data = imgData.data;
    const w = canvas.width;
    const h = canvas.height;
    const visited = new Uint8Array(w * h);
    const queue: number[] = [];

    // Initialize seeds
    for (const seed of seeds) {
      const sx = Math.floor(seed.x);
      const sy = Math.floor(seed.y);
      if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
      const idx = sy * w + sx;
      if (!visited[idx]) {
        visited[idx] = 1;
        queue.push(idx);
      }
    }

    let qHead = 0;
    while (qHead < queue.length) {
      const idx = queue[qHead++];
      const px = idx % w;
      const py = Math.floor(idx / w);
      const pOffset = idx * 4;

      const pr = data[pOffset];
      const pg = data[pOffset + 1];
      const pb = data[pOffset + 2];

      // Erase this background pixel
      data[pOffset + 3] = 0;

      // 4-neighborhood
      const neighbors = [
        [px + 1, py],
        [px - 1, py],
        [px, py + 1],
        [px, py - 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const nIdx = ny * w + nx;
        if (visited[nIdx]) continue;

        const nOffset = nIdx * 4;
        const na = data[nOffset + 3];
        if (na < 15) {
          visited[nIdx] = 1;
          queue.push(nIdx);
          continue;
        }

        const nr = data[nOffset];
        const ng = data[nOffset + 1];
        const nb = data[nOffset + 2];

        // Color distance to current pixel
        const diff = Math.sqrt((nr - pr) ** 2 + (ng - pg) ** 2 + (nb - pb) ** 2);
        if (diff <= tolerance) {
          visited[nIdx] = 1;
          queue.push(nIdx);
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  // Smart Perimeter Background Remover
  const applySmartAutoSilhouette = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    pushSnapshot();

    // Collect seeds along all 4 perimeters (top, bottom, left, right)
    const seeds: Array<{ x: number; y: number }> = [];
    for (let x = 0; x < canvas.width; x += 4) {
      seeds.push({ x, y: 0 });
      seeds.push({ x, y: canvas.height - 1 });
    }
    for (let y = 0; y < canvas.height; y += 4) {
      seeds.push({ x: 0, y });
      seeds.push({ x: canvas.width - 1, y });
    }

    floodFillErase(ctx, canvas, seeds, wandTolerance);
  };

  // Convert all non-transparent pixels into solid Who's That Pokemon silhouette
  const applyAutoSilhouetteMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    pushSnapshot();

    let imgData: ImageData;
    try {
      imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch {
      return;
    }

    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a > 20) {
        data[i] = 15;
        data[i + 1] = 23;
        data[i + 2] = 42;
        data[i + 3] = Math.round(maskOpacity * 255);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  // Smart Feature Mask (blacks out interior colors while keeping crisp shape boundaries)
  const applySmartFeatureMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    pushSnapshot();

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a > 30) {
        data[i] = Math.round(data[i] * 0.15);
        data[i + 1] = Math.round(data[i + 1] * 0.15);
        data[i + 2] = Math.round(data[i + 2] * 0.2);
        data[i + 3] = Math.round(maskOpacity * 255);
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  // Freehand Brush & Eraser
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "lasso") {
      handleLassoClick(e);
      return;
    }

    if (activeTool === "wand") {
      const coords = getCanvasCoords(e);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          pushSnapshot();
          floodFillErase(ctx, canvas, [coords], wandTolerance);
        }
      }
      return;
    }

    pushSnapshot();
    isDrawingRef.current = true;
    paintAt(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "lasso") {
      const coords = getCanvasCoords(e);
      setLassoHoverPoint(coords);
      renderLassoOverlay(coords);
      return;
    }

    if (!isDrawingRef.current) return;
    paintAt(e);
  };

  const handleMouseUp = () => {
    isDrawingRef.current = false;
  };

  const paintAt = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);

    ctx.save();
    if (activeTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(11, 15, 25, ${maskOpacity})`;
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // Polygon / Magnetic Lasso Operations
  const handleLassoClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    if (lassoPoints.length >= 3) {
      const start = lassoPoints[0];
      const dist = Math.hypot(x - start.x, y - start.y);
      if (dist < 18) {
        // User clicked near the start point: close and execute polygon fill!
        finishLassoPolygon(lassoPoints);
        return;
      }
    }

    const updated = [...lassoPoints, { x, y }];
    setLassoPoints(updated);
    renderLassoOverlay({ x, y }, updated);
  };

  const handleLassoDoubleClick = () => {
    if (lassoPoints.length >= 3) {
      finishLassoPolygon(lassoPoints);
    }
  };

  const renderLassoOverlay = (
    currentHover: { x: number; y: number } | null,
    points = lassoPoints
  ) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (points.length === 0) return;

    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    if (currentHover) {
      ctx.lineTo(currentHover.x, currentHover.y);
    }
    ctx.stroke();

    // Render anchor vertices
    points.forEach((p, idx) => {
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, idx === 0 ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = idx === 0 ? "#10b981" : "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    ctx.restore();
  };

  const finishLassoPolygon = (points: { x: number; y: number }[]) => {
    if (points.length < 3) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    pushSnapshot();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();

    if (activeTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(11, 15, 25, ${maskOpacity})`;
      ctx.fill();
    }
    ctx.restore();

    setLassoPoints([]);
    setLassoHoverPoint(null);
    clearOverlay();
  };

  const handlePublish = () => {
    if (!selectedWord.trim()) return;
    const canvas = canvasRef.current;
    const blackoutUrl = canvas ? canvas.toDataURL("image/png") : imageUrl;
    setStudioOpen(false);
    onSetImage(
      imageUrl || blackoutUrl,
      selectedWord.trim(),
      selectedCategory,
      "custom_blackout",
      blackoutUrl,
      selectedBgColor
    );
  };

  const handleQuickWordPick = (word: string) => {
    setSelectedWord(word.toUpperCase());
    const lookup = word.toLowerCase();
    if (CURATED_IMAGE_DATABASE[lookup]) {
      loadImageSrc(CURATED_IMAGE_DATABASE[lookup]);
    } else {
      setImageUrl("");
    }
  };

  return (
    <div className="relative flex flex-col h-full w-full gap-2.5 overflow-hidden">
      {/* Top Game Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-lg flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-black">
            🔍 SILHOUETTE SHOWDOWN
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Host: <strong className="text-white">{creator?.name}</strong>
          </span>
        </div>

        {/* Word Length / Hints on Top (Skribbl style) */}
        <div className="text-center">
          <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider block">
            {mystery.phase === "showcase_reveal" ? "ANSWER REVEALED" : "GUESS THE SHADOW PUZZLE"}
          </span>
          <span className="text-base md:text-xl font-mono font-black text-white tracking-widest uppercase">
            {mystery.phase === "showcase_reveal" ? mystery.targetAnswer : mystery.revealedAnswer}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Shadow Studio & Tools Toggle Button (Always accessible) */}
          <button
            onClick={() => setStudioOpen(!studioOpen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
              studioOpen
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30 hover:scale-105"
            }`}
            title="Open shadow creation studio with auto-erase background and lasso tools"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>{studioOpen ? "Hide Studio" : "🎨 Shadow Studio & Tools"}</span>
          </button>

          {/* Host End Game Button */}
          {isHost && (
            <button
              onClick={onReturnToLobby}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all"
              title="End this game and return to lobby"
            >
              End Game
            </button>
          )}

          {/* Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <Clock
              className={`w-4 h-4 ${
                mystery.timer <= 10 ? "text-rose-400 animate-pulse" : "text-amber-400"
              }`}
            />
            <span
              className={`font-mono font-bold text-base ${
                mystery.timer <= 10 ? "text-rose-400" : "text-white"
              }`}
            >
              {mystery.timer}s
            </span>
          </div>
        </div>
      </div>

      {/* Main Guessing Arena (Visible to Audience) */}
      <div className="relative flex-1 min-h-[360px] bg-gradient-to-b from-purple-950/20 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-4 flex flex-col items-center justify-center shadow-2xl overflow-hidden">
        {/* Shadow Puzzle Frame on chosen background */}
        <div
          className="relative w-72 h-72 md:w-88 md:h-88 flex items-center justify-center p-4 rounded-3xl border border-slate-800 shadow-2xl transition-all duration-300"
          style={{ backgroundColor: mystery.bgColor || "#ffffff" }}
        >
          {(() => {
            const displayImgSrc =
              mystery.phase === "showcase_reveal"
                ? mystery.imageUrl
                : mystery.blackoutDataUrl || mystery.imageUrl;

            if (!displayImgSrc) {
              return (
                <div className="flex flex-col items-center justify-center text-slate-500 gap-2 p-4 text-center">
                  <span className="text-4xl animate-pulse">??</span>
                  <span className="text-xs font-bold text-slate-400">
                    Preparing mystery shadow...
                  </span>
                </div>
              );
            }

            return (
              <img
                src={displayImgSrc}
                alt="Shadow Mystery"
                className={`max-w-full max-h-full object-contain transition-all duration-700 ${
                  mystery.phase === "showcase_reveal"
                    ? "scale-105"
                    : "drop-shadow-[0_0_20px_rgba(168,85,247,0.45)]"
                }`}
              />
            );
          })()}
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
          <div className="px-4 py-1.5 rounded-full bg-slate-950/90 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Type your guess in the live party chat on the right!</span>
          </div>
          <button
            onClick={() => setStudioOpen(true)}
            className="px-3.5 py-1.5 rounded-full bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-200 text-xs font-bold flex items-center gap-1.5 shadow-md transition-all hover:scale-105"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Open Studio Tools</span>
          </button>
        </div>
      </div>

      {/* MODAL: Creator Shadow Studio & Magnetic Lasso Blackout Studio */}
      {studioOpen && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md rounded-2xl flex flex-col p-4 z-30 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 flex-shrink-0">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Silhouette Showdown Creator Studio</span>
              </h2>
              <p className="text-xs text-slate-400">
                Use Background Auto-Erase, Magnetic Lasso, or Pen Tool to black out areas for friends to guess!
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStudioOpen(false)}
                className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
              >
                Close Studio
              </button>
              <button
                onClick={handlePublish}
                disabled={!selectedWord.trim() || !loadedImage}
                className="py-2.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all hover:scale-105"
              >
                <Check className="w-4 h-4" />
                <span>Done! Publish Shadow</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
            {/* Left: Word Suggestions & In-App Web Browser */}
            <div className="flex flex-col gap-3">
              {/* 1. Word Suggestions */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 block mb-2">
                  1. Pick a Suggested Word (or type yours)
                </span>
                <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2">
                  {Object.keys(WORD_SUGGESTIONS).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                        selectedCategory === cat
                          ? "bg-purple-600 text-white"
                          : "bg-slate-950 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {(WORD_SUGGESTIONS[selectedCategory] || []).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => handleQuickWordPick(w)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                        selectedWord === w.toUpperCase()
                          ? "bg-purple-600 text-white border-purple-400 shadow-md"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>

                <div className="mt-2.5 flex gap-2">
                  <input
                    type="text"
                    placeholder="Type custom secret answer..."
                    value={selectedWord}
                    onChange={(e) => setSelectedWord(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white uppercase focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* 2. Mini Web Image Browser & Instant Image Gallery */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex-1 flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 block mb-2">
                  2. Image Browser / Web URL / Clipboard Paste (Ctrl+V)
                </span>

                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Paste image URL here, or press Ctrl+V anywhere..."
                      value={imageUrl}
                      onChange={(e) => loadImageSrc(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <span className="text-[10px] text-slate-500 font-semibold mb-1 block">
                  Quick Recognizable Subjects:
                </span>
                <div className="grid grid-cols-5 gap-2 overflow-y-auto max-h-36 p-1 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  {Object.entries(CURATED_IMAGE_DATABASE).map(([name, url]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setSelectedWord(name.toUpperCase());
                        loadImageSrc(url);
                      }}
                      className="p-1 rounded-lg bg-slate-900 hover:bg-purple-600/30 border border-slate-800 flex flex-col items-center gap-1 group transition-all"
                    >
                      <img src={url} alt={name} className="w-8 h-8 object-contain" />
                      <span className="text-[8px] font-bold text-slate-400 group-hover:text-purple-300 truncate w-full text-center capitalize">
                        {name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Interactive Blackout Studio with Magnetic Lasso, Smart Mask, & BG Selector */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-between gap-2">
              {/* Studio Toolbar Top */}
              <div className="flex flex-wrap items-center justify-between w-full gap-2 border-b border-slate-800 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                  3. Precision Masking & Tools
                </span>

                <div className="flex items-center gap-1">
                  {/* Smart Background Auto-Erase Button */}
                  <button
                    type="button"
                    onClick={() => applySmartAutoSilhouette()}
                    disabled={!loadedImage}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-md shadow-purple-600/30"
                    title="Automatically detect subject, erase background, and create solid shadow silhouette"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>✨ Auto-Erase Background</span>
                  </button>
                  {/* Solid Silhouette (Who's That Pokemon style) */}
                  <button
                    type="button"
                    onClick={applyAutoSilhouetteMask}
                    disabled={!loadedImage}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1 border border-purple-500/30"
                    title="Turn subject into solid Pokemon-style shadow silhouette"
                  >
                    <span>👤 Solid Shadow</span>
                  </button>

                  {/* Smart Feature Mask Button */}
                  <button
                    type="button"
                    onClick={applySmartFeatureMask}
                    disabled={!loadedImage}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1"
                    title="Black out inner features while preserving outer contours"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Auto-Mask</span>
                  </button>

                  {/* Undo Button */}
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={undoStack.length <= 1}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 disabled:opacity-30"
                    title="Undo stroke (Ctrl+Z)"
                  >
                    <Undo className="w-3.5 h-3.5" />
                  </button>

                  {/* Redo Button */}
                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={redoStack.length === 0}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 disabled:opacity-30"
                    title="Redo stroke (Ctrl+Y)"
                  >
                    <Redo className="w-3.5 h-3.5" />
                  </button>

                  {/* Reset Original Button */}
                  <button
                    type="button"
                    onClick={() => loadedImage && initCanvasWithImage(loadedImage)}
                    className="p-1 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-slate-800"
                    title="Reset to original image"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Background Color Picker */}
              <div className="w-full flex items-center justify-between px-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <Palette className="w-3 h-3 text-purple-400" /> Background Color:
                </span>
                <div className="flex items-center gap-1.5">
                  {BG_COLOR_OPTIONS.map((bg) => (
                    <button
                      key={bg.value}
                      type="button"
                      onClick={() => setSelectedBgColor(bg.value)}
                      className={`w-5 h-5 rounded-full border-2 transition-transform ${
                        bg.border
                      } ${
                        selectedBgColor === bg.value
                          ? "scale-125 ring-2 ring-purple-400"
                          : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: bg.value }}
                      title={bg.label}
                    />
                  ))}
                  <input
                    type="color"
                    value={selectedBgColor}
                    onChange={(e) => setSelectedBgColor(e.target.value)}
                    className="w-5 h-5 rounded-full border-0 cursor-pointer p-0 bg-transparent"
                    title="Custom Background Color"
                  />
                </div>
              </div>

              {/* Two-Layer Interactive Canvas (Base Canvas + Overlay Canvas for Magnetic Lasso) */}
              <div
                className="w-72 h-72 rounded-2xl flex items-center justify-center overflow-hidden cursor-crosshair relative shadow-inner border border-slate-800"
                style={{ backgroundColor: selectedBgColor }}
              >
                {/* Base Canvas */}
                <canvas
                  ref={canvasRef}
                  className="w-full h-full block absolute inset-0"
                />

                {/* Interactive Overlay Canvas */}
                <canvas
                  ref={overlayRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onDoubleClick={handleLassoDoubleClick}
                  className="w-full h-full block absolute inset-0 z-10"
                />

                {!loadedImage && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 text-xs p-4 text-center pointer-events-none z-20">
                    <ImageIcon className="w-8 h-8 mb-1.5 opacity-40" />
                    <span>Select an image or press Ctrl+V to paste any picture!</span>
                  </div>
                )}
              </div>

              {/* Lasso Status / Action Helper */}
              {activeTool === "lasso" && (
                <div className="w-full px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-between text-xs text-purple-300">
                  <span>
                    Lasso: {lassoPoints.length} points placed. Double-click or click start point to close.
                  </span>
                  {lassoPoints.length >= 3 && (
                    <button
                      type="button"
                      onClick={() => finishLassoPolygon(lassoPoints)}
                      className="px-2 py-0.5 bg-purple-600 text-white font-bold rounded-lg text-[10px]"
                    >
                      Fill Polygon Mask
                    </button>
                  )}
                </div>
              )}

              {/* Bottom Tool Selector Bar */}
              <div className="w-full p-2 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                {/* Tools: Brush, Eraser, Magnetic Lasso */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool("brush");
                      setLassoPoints([]);
                      clearOverlay();
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeTool === "brush"
                        ? "bg-purple-600 text-white shadow-md"
                        : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <PenTool className="w-3.5 h-3.5 inline mr-1" />
                    <span>🖊️ Pen Tool (Blackout)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool("eraser");
                      setLassoPoints([]);
                      clearOverlay();
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeTool === "eraser"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <Eraser className="w-3 h-3 inline mr-1" />
                    <span>🧹 Eraser</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool("lasso");
                      setLassoPoints([]);
                      clearOverlay();
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      activeTool === "lasso"
                        ? "bg-purple-600 text-white shadow-md ring-2 ring-purple-400"
                        : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                    }`}
                    title="Click vertices to outline region, then close loop to black out area"
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>🧲 Magnetic Lasso</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool("wand");
                      setLassoPoints([]);
                      clearOverlay();
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      activeTool === "wand"
                        ? "bg-purple-600 text-white shadow-md ring-2 ring-purple-400"
                        : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                    }`}
                    title="Click any background region to erase adjacent colors"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>🪄 Magic Wand</span>
                  </button>
                </div>

                {/* Wand Tolerance Slider */}
                {activeTool === "wand" && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-purple-300">
                    <span className="text-[10px] text-slate-400 font-bold">Wand Tol: {wandTolerance}</span>
                    <input
                      type="range"
                      min="10"
                      max="80"
                      value={wandTolerance}
                      onChange={(e) => setWandTolerance(Number(e.target.value))}
                      className="w-16 h-1 accent-purple-500 cursor-pointer"
                    />
                  </div>
                )}
                {/* Brush Sizes */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500 font-bold">Size:</span>
                  {BRUSH_SIZES.map((sz) => (
                    <button
                      key={sz.size}
                      type="button"
                      onClick={() => setBrushSize(sz.size)}
                      className={`w-5 h-5 rounded-md text-[10px] font-bold transition-all ${
                        brushSize === sz.size
                          ? "bg-purple-600 text-white"
                          : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>

                {/* Opacity Options */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500 font-bold">Mask:</span>
                  {OPACITY_OPTIONS.map((op) => (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => setMaskOpacity(op.value)}
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                        maskOpacity === op.value
                          ? "bg-purple-600 text-white"
                          : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Waiting for Creator */}
      {mystery.phase === "prep" && !isCreator && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 z-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-2xl mb-3 animate-pulse">
            🔍
          </div>
          <h2 className="text-lg font-bold text-white mb-1">
            {creator?.name || "Player"} is preparing the mystery shadow puzzle...
          </h2>
          <p className="text-xs text-slate-400">Get ready to race and guess in live chat!</p>
        </div>
      )}

      {/* Modal: Reveal Answer */}
      {mystery.phase === "showcase_reveal" && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-20 text-center animate-fade-in">
          <span className="text-xs uppercase font-bold text-purple-400 tracking-widest mb-1">
            Mystery Solved!
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
            It was: <span className="text-purple-300 uppercase">{mystery.targetAnswer}</span>
          </h2>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-full max-w-sm">
            <span className="text-xs font-semibold text-slate-400 block mb-2">
              Players who identified it ({mystery.guessedPlayerIds.length}):
            </span>
            <div className="flex flex-wrap gap-2 justify-center">
              {mystery.guessedPlayerIds.map((pid) => (
                <span
                  key={pid}
                  className="px-2.5 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-medium"
                >
                  ✓ {roomState.players[pid]?.name || "Player"}
                </span>
              ))}
              {mystery.guessedPlayerIds.length === 0 && (
                <span className="text-xs text-slate-500 italic">No one guessed in time!</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Game Over Podium */}
      {mystery.phase === "game_over" && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg rounded-2xl flex flex-col items-center justify-center p-6 z-30">
          <Trophy className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
          <h2 className="text-3xl font-black text-white mb-6">Game Over!</h2>

          {isHost && (
            <button
              onClick={onReturnToLobby}
              className="py-3 px-6 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Party Lobby</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

