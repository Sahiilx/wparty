"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Trash2, Eraser, ZoomIn, ZoomOut, Undo, Redo, Pipette } from "lucide-react";
import { DrawCommand, DrawStroke } from "../../../../party/types";

interface DrawingCanvasProps {
  canvasId?: "1" | "2";
  isDrawer: boolean;
  label?: string;
  badge?: string;
  badgeColor?: string;
  onDrawCommand?: (cmd: DrawCommand) => void;
  registerDrawHandler?: (handler: (cmd: DrawCommand) => void) => void;
  canvasHistory?: DrawCommand[];
}

const PALETTE = [
  "#000000", "#ffffff", "#64748b", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#10b981",
  "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
  "#d946ef", "#ec4899", "#854d0e", "#78350f"
];

const BRUSH_SIZES = [2, 6, 12, 24, 48];
const OPACITIES = [1.0, 0.75, 0.5, 0.25];
const ZOOM_STEPS = [0.75, 0.9, 1.0, 1.15, 1.35];

export function DrawingCanvas({
  canvasId = "1",
  isDrawer,
  label,
  badge,
  badgeColor = "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  onDrawCommand,
  registerDrawHandler,
  canvasHistory = [],
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const lastChunkIndexRef = useRef(0);
  const lastBroadcastTimeRef = useRef(0);
  const prevHistoryCountRef = useRef(-1);

  // Tools state
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(6);
  const [opacity, setOpacity] = useState(1.0);
  const [isEraser, setIsEraser] = useState(false);
  const [zoomIdx, setZoomIdx] = useState(2); // 1.0 (100%)

  // Local Undo/Redo Stacks
  const [undoStack, setUndoStack] = useState<DrawCommand[]>([]);
  const [redoStack, setRedoStack] = useState<DrawCommand[]>([]);

  const activeToolRef = useRef({ color, brushSize, opacity, isEraser });
  useEffect(() => {
    activeToolRef.current = { color, brushSize, opacity, isEraser };
  }, [color, brushSize, opacity, isEraser]);

  const currentZoom = ZOOM_STEPS[zoomIdx];

  const changeZoom = (delta: number) => {
    setZoomIdx((prev) => Math.max(0, Math.min(ZOOM_STEPS.length - 1, prev + delta)));
  };

  const renderStroke = (
    ctx: CanvasRenderingContext2D,
    stroke: DrawStroke,
    w: number,
    h: number
  ) => {
    if (stroke.points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = Math.max(1, (stroke.size / 800) * w);
    ctx.globalAlpha = stroke.opacity ?? 1.0;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);

    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x * w, stroke.points[i].y * h);
    }
    ctx.stroke();
    ctx.restore();
  };

  const redrawAll = useCallback((commands: DrawCommand[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const cmd of commands) {
      if (cmd.canvasId && cmd.canvasId !== canvasId) continue;
      if (cmd.type === "clear") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (cmd.type === "stroke") {
        renderStroke(ctx, cmd.stroke, canvas.width, canvas.height);
      }
    }

    if (isDrawingRef.current && currentStrokeRef.current.length >= 2) {
      const tool = activeToolRef.current;
      renderStroke(
        ctx,
        {
          color: tool.isEraser ? "#ffffff" : tool.color,
          size: tool.brushSize,
          opacity: tool.opacity,
          points: currentStrokeRef.current,
        },
        canvas.width,
        canvas.height
      );
    }
  }, [canvasId]);

  useEffect(() => {
    const relevantCount = canvasHistory.filter(
      (c) => !c.canvasId || c.canvasId === canvasId
    ).length;

    if (relevantCount !== prevHistoryCountRef.current) {
      prevHistoryCountRef.current = relevantCount;
      redrawAll(canvasHistory);
      setUndoStack(canvasHistory.filter((c) => !c.canvasId || c.canvasId === canvasId));
    }
  }, [canvasHistory, canvasId, redrawAll]);

  useEffect(() => {
    if (registerDrawHandler) {
      registerDrawHandler((cmd) => {
        if (cmd.canvasId && cmd.canvasId !== canvasId) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        if (cmd.type === "clear") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (cmd.type === "stroke") {
          renderStroke(ctx, cmd.stroke, canvas.width, canvas.height);
        }
      });
    }
  }, [registerDrawHandler, canvasId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      redrawAll(canvasHistory);
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [canvasHistory, redrawAll]);

  // Keyboard Shortcuts: Ctrl+Z (Undo), Ctrl+Y (Redo)
  useEffect(() => {
    if (!isDrawer) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawer, undoStack, redoStack]);

  const getNormalizedPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  const handleStartDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer) return;
    const pt = getNormalizedPoint(e);
    if (!pt) return;

    isDrawingRef.current = true;
    currentStrokeRef.current = [pt];
    lastChunkIndexRef.current = 0;
    lastBroadcastTimeRef.current = Date.now();
    setRedoStack([]); // clear redo stack on new stroke
  };

  const handleMoveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || !isDrawingRef.current) return;
    const pt = getNormalizedPoint(e);
    if (!pt) return;

    currentStrokeRef.current.push(pt);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx && currentStrokeRef.current.length >= 2) {
        const stroke: DrawStroke = {
          color: isEraser ? "#ffffff" : color,
          size: brushSize,
          opacity: opacity,
          points: currentStrokeRef.current.slice(-2),
        };
        renderStroke(ctx, stroke, canvas.width, canvas.height);
      }
    }

    const now = Date.now();
    const pointsSinceChunk = currentStrokeRef.current.length - lastChunkIndexRef.current;
    if (pointsSinceChunk >= 4 && now - lastBroadcastTimeRef.current >= 45 && onDrawCommand) {
      const chunkPoints = currentStrokeRef.current.slice(lastChunkIndexRef.current);
      const cmd: DrawCommand = {
        type: "stroke",
        stroke: {
          color: isEraser ? "#ffffff" : color,
          size: brushSize,
          opacity: opacity,
          points: chunkPoints,
        },
        canvasId,
      };
      onDrawCommand(cmd);
      setUndoStack((prev) => [...prev, cmd]);
      lastChunkIndexRef.current = currentStrokeRef.current.length - 1;
      lastBroadcastTimeRef.current = now;
    }
  };

  const handleEndDraw = () => {
    if (!isDrawer || !isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (currentStrokeRef.current.length > 1 && onDrawCommand) {
      const remainingPoints = currentStrokeRef.current.slice(lastChunkIndexRef.current);
      if (remainingPoints.length > 1) {
        const cmd: DrawCommand = {
          type: "stroke",
          stroke: {
            color: isEraser ? "#ffffff" : color,
            size: brushSize,
            opacity: opacity,
            points: remainingPoints,
          },
          canvasId,
        };
        onDrawCommand(cmd);
        setUndoStack((prev) => [...prev, cmd]);
      }
    }
    currentStrokeRef.current = [];
    lastChunkIndexRef.current = 0;
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, last]);
    const nextUndo = undoStack.slice(0, -1);
    setUndoStack(nextUndo);
    redrawAll(nextUndo);

    if (onDrawCommand) {
      onDrawCommand({ type: "clear", canvasId });
      for (const cmd of nextUndo) {
        onDrawCommand(cmd);
      }
    }
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const toRestore = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    const nextUndo = [...undoStack, toRestore];
    setUndoStack(nextUndo);
    redrawAll(nextUndo);

    if (onDrawCommand) {
      onDrawCommand(toRestore);
    }
  };

  const handleClear = () => {
    if (!isDrawer) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    currentStrokeRef.current = [];
    setUndoStack([]);
    setRedoStack([]);
    if (onDrawCommand) {
      onDrawCommand({ type: "clear", canvasId });
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Canvas Top Bar & Zoom */}
      <div className="px-3 py-1.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          {label && <span className="text-xs font-bold text-slate-200 truncate">{label}</span>}
          {badge && (
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>

        {/* Undo / Redo & Zoom Controls */}
        <div className="flex items-center gap-2">
          {isDrawer && (
            <div className="flex items-center gap-1 bg-slate-900 px-1 py-0.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                title="Redo (Ctrl+Y)"
              >
                <Redo className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Canvas Zoom Module */}
          <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => changeZoom(-1)}
              disabled={zoomIdx === 0}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              title="Zoom Out Canvas"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setZoomIdx(2)}
              className="text-[10px] font-mono font-bold text-indigo-300 px-1 hover:text-white select-none"
              title="Reset Zoom to 100%"
            >
              {Math.round(currentZoom * 100)}%
            </button>

            <button
              type="button"
              onClick={() => changeZoom(1)}
              disabled={zoomIdx === ZOOM_STEPS.length - 1}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              title="Zoom In Canvas"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area with Zoom Transform & Locked 4:3 Aspect Ratio */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-slate-900/80 cursor-crosshair overflow-hidden touch-none flex items-center justify-center p-2"
      >
        <div
          className="relative transition-transform duration-150 origin-center flex items-center justify-center bg-white rounded-2xl shadow-2xl overflow-hidden"
          style={{
            transform: `scale(${currentZoom})`,
            aspectRatio: "4 / 3",
            maxWidth: "100%",
            maxHeight: "100%",
            width: "100%",
            margin: "auto",
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleStartDraw}
            onMouseMove={handleMoveDraw}
            onMouseUp={handleEndDraw}
            onMouseLeave={handleEndDraw}
            onTouchStart={handleStartDraw}
            onTouchMove={handleMoveDraw}
            onTouchEnd={handleEndDraw}
            className="w-full h-full block"
          />
        </div>

        {!isDrawer && (
          <div className="absolute top-2 right-2 px-2.5 py-1 bg-slate-900/80 backdrop-blur text-slate-300 text-[10px] rounded-full font-medium pointer-events-none">
            Live Spectating
          </div>
        )}
      </div>

      {/* Advanced Drawer Toolbar */}
      {isDrawer && (
        <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 z-10">
          {/* Colors Palette & Custom Picker */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c);
                  setIsEraser(false);
                }}
                className={`w-5 h-5 rounded-full border border-slate-700 transition-all ${
                  !isEraser && color === c ? "scale-125 ring-2 ring-indigo-400" : "hover:scale-110"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}

            {/* Custom Color Input */}
            <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-600 hover:scale-110 transition-transform">
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  setIsEraser(false);
                }}
                className="absolute inset-0 w-8 h-8 -top-1 -left-1 cursor-pointer"
                title="Choose custom color"
              />
            </div>
          </div>

          {/* Brush Sizes, Opacity & Tools */}
          <div className="flex items-center gap-2">
            {/* Opacity Selector */}
            <div className="flex items-center gap-1 bg-slate-900 px-1 py-0.5 rounded-xl border border-slate-800">
              {OPACITIES.map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setOpacity(op)}
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                    opacity === op ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                  title={`Opacity: ${op * 100}%`}
                >
                  {op * 100}%
                </button>
              ))}
            </div>

            {/* Brush Sizes */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {BRUSH_SIZES.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setBrushSize(sz)}
                  className={`w-6 h-6 flex items-center justify-center rounded-lg transition-all ${
                    brushSize === sz ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-400"
                  }`}
                  title={`Size: ${sz}px`}
                >
                  <span
                    className="rounded-full bg-current block"
                    style={{ width: Math.min(16, sz / 2 + 2), height: Math.min(16, sz / 2 + 2) }}
                  />
                </button>
              ))}
            </div>

            {/* Eraser */}
            <button
              type="button"
              onClick={() => setIsEraser(!isEraser)}
              className={`p-1.5 rounded-xl border transition-all ${
                isEraser
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
              }`}
              title="Eraser"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>

            {/* Clear Board */}
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 transition-all"
              title="Clear Canvas"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
