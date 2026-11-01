"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Trash2,
  Eraser,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  PaintBucket,
  Minus,
  Square,
  Circle,
  Triangle,
  PenTool,
  Sparkles,
  Check,
  RotateCcw,
} from "lucide-react";
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
const ZOOM_STEPS = [0.75, 0.9, 1.0, 1.15, 1.35];

export type ToolType = "brush" | "spray" | "line" | "shape" | "fill" | "lasso" | "eraser";
export type ShapeType = "rect" | "circle" | "triangle";

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
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const lineStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastChunkIndexRef = useRef(0);
  const lastBroadcastTimeRef = useRef(0);
  const prevHistoryCountRef = useRef(-1);

  // Persistent internal command stack to ensure strokes never vanish on mouse-up
  const internalHistoryRef = useRef<DrawCommand[]>([]);

  // Tools state
  const [activeTool, setActiveTool] = useState<ToolType>("brush");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(6);
  const [opacity, setOpacity] = useState(1.0); // 0.05 to 1.0
  const [shapeType, setShapeType] = useState<ShapeType>("rect");
  const [shapeFill, setShapeFill] = useState(true); // true = full shape, false = outline
  const [zoomIdx, setZoomIdx] = useState(2); // 1.0 (100%)

  // Lasso / Pen tool points
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>([]);
  const [lassoHoverPoint, setLassoHoverPoint] = useState<{ x: number; y: number } | null>(null);

  // Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState<DrawCommand[]>([]);
  const [redoStack, setRedoStack] = useState<DrawCommand[]>([]);

  const activeToolRef = useRef({ activeTool, color, brushSize, opacity, shapeType, shapeFill });
  useEffect(() => {
    activeToolRef.current = { activeTool, color, brushSize, opacity, shapeType, shapeFill };
  }, [activeTool, color, brushSize, opacity, shapeType, shapeFill]);

  const currentZoom = ZOOM_STEPS[zoomIdx];

  const changeZoom = (delta: number) => {
    setZoomIdx((prev) => Math.max(0, Math.min(ZOOM_STEPS.length - 1, prev + delta)));
  };

  // --- RENDERING PRIMITIVES ---
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

  const renderSpray = (
    ctx: CanvasRenderingContext2D,
    stroke: DrawStroke,
    w: number,
    h: number
  ) => {
    ctx.save();
    ctx.fillStyle = stroke.color;
    ctx.globalAlpha = (stroke.opacity ?? 1.0) * 0.7;
    const radius = Math.max(4, (stroke.size / 400) * w);
    const density = Math.max(8, Math.round(stroke.size * 1.2));

    for (const pt of stroke.points) {
      const cx = pt.x * w;
      const cy = pt.y * h;
      for (let i = 0; i < density; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;
        const dotX = cx + Math.cos(angle) * r;
        const dotY = cy + Math.sin(angle) * r;
        ctx.fillRect(dotX, dotY, 1.5, 1.5);
      }
    }
    ctx.restore();
  };

  const renderLine = (
    ctx: CanvasRenderingContext2D,
    start: { x: number; y: number },
    end: { x: number; y: number },
    lineColor: string,
    size: number,
    lineOpacity: number = 1.0,
    w: number,
    h: number
  ) => {
    ctx.save();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = Math.max(1, (size / 800) * w);
    ctx.globalAlpha = lineOpacity;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(start.x * w, start.y * h);
    ctx.lineTo(end.x * w, end.y * h);
    ctx.stroke();
    ctx.restore();
  };

  const renderShape = (
    ctx: CanvasRenderingContext2D,
    shape: ShapeType,
    fill: boolean,
    start: { x: number; y: number },
    end: { x: number; y: number },
    shapeColor: string,
    size: number,
    shapeOpacity: number = 1.0,
    w: number,
    h: number
  ) => {
    ctx.save();
    ctx.strokeStyle = shapeColor;
    ctx.fillStyle = shapeColor;
    ctx.lineWidth = Math.max(1, (size / 800) * w);
    ctx.globalAlpha = shapeOpacity;

    const x1 = start.x * w;
    const y1 = start.y * h;
    const x2 = end.x * w;
    const y2 = end.y * h;

    if (shape === "rect") {
      const rx = Math.min(x1, x2);
      const ry = Math.min(y1, y2);
      const rw = Math.abs(x2 - x1);
      const rh = Math.abs(y2 - y1);
      if (fill) {
        ctx.fillRect(rx, ry, rw, rh);
      } else {
        ctx.strokeRect(rx, ry, rw, rh);
      }
    } else if (shape === "circle") {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const rx = Math.max(1, Math.abs(x2 - x1) / 2);
      const ry = Math.max(1, Math.abs(y2 - y1) / 2);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (fill) {
        ctx.fill();
      } else {
        ctx.stroke();
      }
    } else if (shape === "triangle") {
      const topX = (x1 + x2) / 2;
      const topY = Math.min(y1, y2);
      const bottomY = Math.max(y1, y2);
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.lineTo(x1, bottomY);
      ctx.lineTo(x2, bottomY);
      ctx.closePath();
      if (fill) {
        ctx.fill();
      } else {
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  const renderLasso = (
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    lassoColor: string,
    lassoOpacity: number = 1.0,
    fill: boolean = true,
    w: number,
    h: number
  ) => {
    if (points.length < 3) return;
    ctx.save();
    ctx.fillStyle = lassoColor;
    ctx.strokeStyle = lassoColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = lassoOpacity;

    ctx.beginPath();
    ctx.moveTo(points[0].x * w, points[0].y * h);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * w, points[i].y * h);
    }
    ctx.closePath();

    if (fill) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
    ctx.restore();
  };

  // Fast HTML5 Canvas Flood Fill (Paint Bucket)
  const performFloodFill = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    normX: number,
    normY: number,
    fillHex: string,
    fillOpacity: number = 1.0
  ) => {
    const px = Math.floor(normX * w);
    const py = Math.floor(normY * h);
    if (px < 0 || px >= w || py < 0 || py >= h) return;

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const fillR = parseInt(fillHex.slice(1, 3), 16) || 0;
    const fillG = parseInt(fillHex.slice(3, 5), 16) || 0;
    const fillB = parseInt(fillHex.slice(5, 7), 16) || 0;
    const fillA = Math.round(fillOpacity * 255);

    const startIdx = (py * w + px) * 4;
    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];
    const targetA = data[startIdx + 3];

    if (
      Math.abs(targetR - fillR) < 10 &&
      Math.abs(targetG - fillG) < 10 &&
      Math.abs(targetB - fillB) < 10 &&
      Math.abs(targetA - fillA) < 10
    ) {
      return;
    }

    const matchThreshold = 35;
    const queue = [px, py];
    const visited = new Uint8Array(w * h);
    visited[py * w + px] = 1;

    while (queue.length > 0) {
      const curY = queue.pop()!;
      const curX = queue.pop()!;
      const idx = (curY * w + curX) * 4;

      data[idx] = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      data[idx + 3] = fillA;

      const nbs = [
        [curX + 1, curY],
        [curX - 1, curY],
        [curX, curY + 1],
        [curX, curY - 1],
      ];

      for (const [nx, ny] of nbs) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const pos = ny * w + nx;
          if (!visited[pos]) {
            visited[pos] = 1;
            const nIdx = pos * 4;
            const diff =
              Math.abs(data[nIdx] - targetR) +
              Math.abs(data[nIdx + 1] - targetG) +
              Math.abs(data[nIdx + 2] - targetB) +
              Math.abs(data[nIdx + 3] - targetA);
            if (diff <= matchThreshold * 2) {
              queue.push(nx, ny);
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  // Execute a single command on canvas context
  const executeCommand = useCallback(
    (ctx: CanvasRenderingContext2D, cmd: DrawCommand, w: number, h: number) => {
      if (cmd.canvasId && cmd.canvasId !== canvasId) return;

      if (cmd.type === "clear") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      } else if (cmd.type === "stroke") {
        renderStroke(ctx, cmd.stroke, w, h);
      } else if (cmd.type === "spray") {
        renderSpray(ctx, cmd.stroke, w, h);
      } else if (cmd.type === "line") {
        renderLine(ctx, cmd.start, cmd.end, cmd.color, cmd.size, cmd.opacity ?? 1.0, w, h);
      } else if (cmd.type === "shape") {
        renderShape(ctx, cmd.shape, cmd.fill, cmd.start, cmd.end, cmd.color, cmd.size, cmd.opacity ?? 1.0, w, h);
      } else if (cmd.type === "fill") {
        performFloodFill(ctx, w, h, cmd.x, cmd.y, cmd.color, cmd.opacity ?? 1.0);
      } else if (cmd.type === "lasso") {
        renderLasso(ctx, cmd.points, cmd.color, cmd.opacity ?? 1.0, cmd.fill ?? true, w, h);
      }
    },
    [canvasId]
  );

  const redrawAll = useCallback(
    (commands: DrawCommand[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const cmd of commands) {
        executeCommand(ctx, cmd, canvas.width, canvas.height);
      }
    },
    [executeCommand]
  );

  // Sync external history or fallback to internal stack
  useEffect(() => {
    const activeHistory = canvasHistory.length > 0 ? canvasHistory : internalHistoryRef.current;
    const relevantCount = activeHistory.filter((c) => !c.canvasId || c.canvasId === canvasId).length;

    if (relevantCount !== prevHistoryCountRef.current) {
      prevHistoryCountRef.current = relevantCount;
      redrawAll(activeHistory);
      setUndoStack(activeHistory.filter((c) => !c.canvasId || c.canvasId === canvasId));
    }
  }, [canvasHistory, canvasId, redrawAll]);

  // Live incoming network draw handler
  useEffect(() => {
    if (registerDrawHandler) {
      registerDrawHandler((cmd) => {
        if (cmd.canvasId && cmd.canvasId !== canvasId) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        executeCommand(ctx, cmd, canvas.width, canvas.height);
      });
    }
  }, [registerDrawHandler, canvasId, executeCommand]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayCanvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      if (overlay) {
        overlay.width = rect.width * dpr;
        overlay.height = rect.height * dpr;
      }
      const activeHistory = canvasHistory.length > 0 ? canvasHistory : internalHistoryRef.current;
      redrawAll(activeHistory);
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [canvasHistory, redrawAll]);

  // Keyboard Shortcuts: Ctrl+Z (Undo), Ctrl+Y (Redo), Backspace (Undo Lasso Point)
  useEffect(() => {
    if (!isDrawer) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        if (activeTool === "lasso" && lassoPoints.length > 0) {
          handleUndoLassoPoint();
        } else {
          handleUndo();
        }
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))
      ) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "Backspace" && activeTool === "lasso" && lassoPoints.length > 0) {
        e.preventDefault();
        handleUndoLassoPoint();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawer, undoStack, redoStack, activeTool, lassoPoints]);

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
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  // --- LASSO / PEN TOOL OVERLAY ---
  const renderLassoOverlay = (hoverPt?: { x: number; y: number } | null, pts = lassoPoints) => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    const w = overlay.width;
    const h = overlay.height;

    ctx.clearRect(0, 0, w, h);
    if (pts.length === 0) return;

    ctx.save();
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(pts[0].x * w, pts[0].y * h);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x * w, pts[i].y * h);
    }
    if (hoverPt) {
      ctx.lineTo(hoverPt.x * w, hoverPt.y * h);
    }
    ctx.stroke();

    // Draw circular anchor handles
    ctx.setLineDash([]);
    for (let i = 0; i < pts.length; i++) {
      ctx.beginPath();
      ctx.arc(pts[i].x * w, pts[i].y * h, i === 0 ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? "#10b981" : "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#4338ca";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  };

  const handleLassoClick = (pt: { x: number; y: number }) => {
    // If clicked near starting point and at least 3 points placed -> close polygon
    if (lassoPoints.length >= 3) {
      const start = lassoPoints[0];
      const dist = Math.hypot(pt.x - start.x, pt.y - start.y);
      if (dist < 0.035) {
        finishLassoPolygon(lassoPoints);
        return;
      }
    }
    const updated = [...lassoPoints, pt];
    setLassoPoints(updated);
    renderLassoOverlay(pt, updated);
  };

  const handleUndoLassoPoint = () => {
    if (lassoPoints.length === 0) return;
    const updated = lassoPoints.slice(0, -1);
    setLassoPoints(updated);
    renderLassoOverlay(lassoHoverPoint, updated);
  };

  const finishLassoPolygon = (points: { x: number; y: number }[]) => {
    if (points.length < 3) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const cmd: DrawCommand = {
      type: "lasso",
      points,
      color: activeToolRef.current.color,
      opacity: activeToolRef.current.opacity,
      fill: activeToolRef.current.shapeFill,
      canvasId,
    };

    executeCommand(ctx, cmd, canvas.width, canvas.height);
    internalHistoryRef.current.push(cmd);
    setUndoStack((prev) => [...prev, cmd]);
    setRedoStack([]);
    if (onDrawCommand) onDrawCommand(cmd);

    setLassoPoints([]);
    setLassoHoverPoint(null);
    const overlay = overlayCanvasRef.current;
    if (overlay) {
      const oCtx = overlay.getContext("2d");
      oCtx?.clearRect(0, 0, overlay.width, overlay.height);
    }
  };

  // --- MOUSE / TOUCH EVENTS ---
  const handleStartDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer) return;
    const pt = getNormalizedPoint(e);
    if (!pt) return;

    const tool = activeToolRef.current.activeTool;

    // Fill tool executes on click
    if (tool === "fill") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const cmd: DrawCommand = {
        type: "fill",
        color: activeToolRef.current.color,
        opacity: activeToolRef.current.opacity,
        x: pt.x,
        y: pt.y,
        canvasId,
      };

      executeCommand(ctx, cmd, canvas.width, canvas.height);
      internalHistoryRef.current.push(cmd);
      setUndoStack((prev) => [...prev, cmd]);
      setRedoStack([]);
      if (onDrawCommand) onDrawCommand(cmd);
      return;
    }

    // Lasso tool places points on click
    if (tool === "lasso") {
      handleLassoClick(pt);
      return;
    }

    isDrawingRef.current = true;
    currentStrokeRef.current = [pt];
    lineStartRef.current = pt;
    lastChunkIndexRef.current = 0;
    lastBroadcastTimeRef.current = Date.now();
    setRedoStack([]);
  };

  const handleMoveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer) return;
    const pt = getNormalizedPoint(e);
    if (!pt) return;

    const tool = activeToolRef.current.activeTool;

    if (tool === "lasso") {
      setLassoHoverPoint(pt);
      renderLassoOverlay(pt);
      return;
    }

    if (!isDrawingRef.current) return;

    currentStrokeRef.current.push(pt);

    const canvas = canvasRef.current;
    const overlay = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Line and Shape tools render preview on overlay canvas
    if (tool === "line" && lineStartRef.current && overlay) {
      const oCtx = overlay.getContext("2d");
      if (oCtx) {
        oCtx.clearRect(0, 0, overlay.width, overlay.height);
        renderLine(
          oCtx,
          lineStartRef.current,
          pt,
          activeToolRef.current.color,
          activeToolRef.current.brushSize,
          activeToolRef.current.opacity,
          overlay.width,
          overlay.height
        );
      }
      return;
    }

    if (tool === "shape" && lineStartRef.current && overlay) {
      const oCtx = overlay.getContext("2d");
      if (oCtx) {
        oCtx.clearRect(0, 0, overlay.width, overlay.height);
        renderShape(
          oCtx,
          activeToolRef.current.shapeType,
          activeToolRef.current.shapeFill,
          lineStartRef.current,
          pt,
          activeToolRef.current.color,
          activeToolRef.current.brushSize,
          activeToolRef.current.opacity,
          overlay.width,
          overlay.height
        );
      }
      return;
    }

    // Freehand Brush & Eraser live draw
    if (tool === "brush" || tool === "eraser") {
      const stroke: DrawStroke = {
        color: tool === "eraser" ? "#ffffff" : activeToolRef.current.color,
        size: activeToolRef.current.brushSize,
        opacity: tool === "eraser" ? 1.0 : activeToolRef.current.opacity,
        points: currentStrokeRef.current.slice(-2),
      };
      renderStroke(ctx, stroke, canvas.width, canvas.height);
    } else if (tool === "spray") {
      const stroke: DrawStroke = {
        color: activeToolRef.current.color,
        size: activeToolRef.current.brushSize,
        opacity: activeToolRef.current.opacity,
        points: [pt],
      };
      renderSpray(ctx, stroke, canvas.width, canvas.height);
    }

    // High performance 60 FPS live broadcast chunks
    const now = Date.now();
    const pointsSinceChunk = currentStrokeRef.current.length - lastChunkIndexRef.current;
    if (pointsSinceChunk >= 2 && now - lastBroadcastTimeRef.current >= 16 && onDrawCommand) {
      const chunkPoints = currentStrokeRef.current.slice(lastChunkIndexRef.current);
      const isSpray = tool === "spray";
      const cmd: DrawCommand = {
        type: isSpray ? "spray" : "stroke",
        stroke: {
          color: tool === "eraser" ? "#ffffff" : activeToolRef.current.color,
          size: activeToolRef.current.brushSize,
          opacity: tool === "eraser" ? 1.0 : activeToolRef.current.opacity,
          points: chunkPoints,
        },
        canvasId,
      };
      onDrawCommand(cmd);
      internalHistoryRef.current.push(cmd);
      setUndoStack((prev) => [...prev, cmd]);
      lastChunkIndexRef.current = currentStrokeRef.current.length - 1;
      lastBroadcastTimeRef.current = now;
    }
  };

  const handleEndDraw = () => {
    if (!isDrawer || !isDrawingRef.current) return;
    isDrawingRef.current = false;

    const tool = activeToolRef.current.activeTool;
    const canvas = canvasRef.current;
    const overlay = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Clear overlay preview
    if (overlay) {
      const oCtx = overlay.getContext("2d");
      oCtx?.clearRect(0, 0, overlay.width, overlay.height);
    }

    // Commit Line
    if (tool === "line" && lineStartRef.current && currentStrokeRef.current.length > 0) {
      const endPt = currentStrokeRef.current[currentStrokeRef.current.length - 1];
      const cmd: DrawCommand = {
        type: "line",
        start: lineStartRef.current,
        end: endPt,
        color: activeToolRef.current.color,
        size: activeToolRef.current.brushSize,
        opacity: activeToolRef.current.opacity,
        canvasId,
      };
      executeCommand(ctx, cmd, canvas.width, canvas.height);
      internalHistoryRef.current.push(cmd);
      setUndoStack((prev) => [...prev, cmd]);
      if (onDrawCommand) onDrawCommand(cmd);
    }

    // Commit Shape
    else if (tool === "shape" && lineStartRef.current && currentStrokeRef.current.length > 0) {
      const endPt = currentStrokeRef.current[currentStrokeRef.current.length - 1];
      const cmd: DrawCommand = {
        type: "shape",
        shape: activeToolRef.current.shapeType,
        fill: activeToolRef.current.shapeFill,
        start: lineStartRef.current,
        end: endPt,
        color: activeToolRef.current.color,
        size: activeToolRef.current.brushSize,
        opacity: activeToolRef.current.opacity,
        canvasId,
      };
      executeCommand(ctx, cmd, canvas.width, canvas.height);
      internalHistoryRef.current.push(cmd);
      setUndoStack((prev) => [...prev, cmd]);
      if (onDrawCommand) onDrawCommand(cmd);
    }

    // Commit remaining stroke points
    else if (currentStrokeRef.current.length > 1 && onDrawCommand) {
      const remainingPoints = currentStrokeRef.current.slice(lastChunkIndexRef.current);
      if (remainingPoints.length > 1) {
        const isSpray = tool === "spray";
        const cmd: DrawCommand = {
          type: isSpray ? "spray" : "stroke",
          stroke: {
            color: tool === "eraser" ? "#ffffff" : activeToolRef.current.color,
            size: activeToolRef.current.brushSize,
            opacity: tool === "eraser" ? 1.0 : activeToolRef.current.opacity,
            points: remainingPoints,
          },
          canvasId,
        };
        onDrawCommand(cmd);
        internalHistoryRef.current.push(cmd);
        setUndoStack((prev) => [...prev, cmd]);
      }
    }

    currentStrokeRef.current = [];
    lineStartRef.current = null;
    lastChunkIndexRef.current = 0;
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, last]);
    const nextUndo = undoStack.slice(0, -1);
    setUndoStack(nextUndo);
    internalHistoryRef.current = nextUndo;
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
    internalHistoryRef.current = nextUndo;
    redrawAll(nextUndo);

    if (onDrawCommand) {
      onDrawCommand(toRestore);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    internalHistoryRef.current = [];
    setUndoStack([]);
    setRedoStack([]);
    setLassoPoints([]);
    if (onDrawCommand) {
      onDrawCommand({ type: "clear", canvasId });
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative select-none">
      {/* Top Controls: Zoom, Undo, Redo, Clear */}
      <div className="px-3 py-1.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          {label && <span className="text-xs font-bold text-slate-200 truncate">{label}</span>}
          {badge && (
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isDrawer && (
            <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-xl border border-slate-800">
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
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-rose-400 hover:text-rose-300 transition-all ml-1"
                title="Clear Canvas"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Zoom */}
          <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => changeZoom(-1)}
              disabled={zoomIdx === 0}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomIdx(2)}
              className="text-[10px] font-mono font-bold text-indigo-300 px-1 hover:text-white"
              title="Reset Zoom"
            >
              {Math.round(currentZoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => changeZoom(1)}
              disabled={zoomIdx === ZOOM_STEPS.length - 1}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full bg-slate-950 overflow-hidden flex items-center justify-center p-2"
      >
        <div
          className="relative w-full h-full max-w-[800px] max-h-[600px] aspect-[4/3] flex items-center justify-center transition-transform duration-100 ease-out"
          style={{ transform: `scale(${currentZoom})` }}
        >
          {/* Main Drawing Layer */}
          <canvas
            ref={canvasRef}
            onMouseDown={handleStartDraw}
            onMouseMove={handleMoveDraw}
            onMouseUp={handleEndDraw}
            onMouseLeave={handleEndDraw}
            onTouchStart={handleStartDraw}
            onTouchMove={handleMoveDraw}
            onTouchEnd={handleEndDraw}
            className={`w-full h-full rounded-xl bg-white shadow-xl touch-none ${
              isDrawer
                ? activeTool === "fill"
                  ? "cursor-crosshair"
                  : activeTool === "lasso"
                  ? "cursor-cell"
                  : "cursor-crosshair"
                : "cursor-default"
            }`}
          />

          {/* Interactive Overlay Layer (Lasso lines, Line/Shape drag preview) */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none rounded-xl"
          />
        </div>

        {/* Lasso Floating Helper Banner */}
        {activeTool === "lasso" && isDrawer && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900/95 border border-indigo-500/40 rounded-xl shadow-xl flex items-center gap-2 z-20 animate-fade-in text-xs">
            <span className="text-indigo-300 font-bold">
              🖊️ Pen/Lasso: {lassoPoints.length} points
            </span>
            {lassoPoints.length > 0 && (
              <button
                type="button"
                onClick={handleUndoLassoPoint}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1"
                title="Undo last point (Backspace)"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span>Undo Point</span>
              </button>
            )}
            {lassoPoints.length >= 3 && (
              <button
                type="button"
                onClick={() => finishLassoPolygon(lassoPoints)}
                className="px-2.5 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 shadow-md"
              >
                <Check className="w-3 h-3" />
                <span>Close & Fill</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Drawer Tool Controls */}
      {isDrawer && (
        <div className="px-3 py-2 bg-slate-950/95 border-t border-slate-800 flex flex-col gap-2 z-10">
          {/* Row 1: Primary Tools Selector */}
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {/* Brush */}
              <button
                type="button"
                onClick={() => setActiveTool("brush")}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  activeTool === "brush"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Freehand Brush"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Brush</span>
              </button>

              {/* Spray */}
              <button
                type="button"
                onClick={() => setActiveTool("spray")}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  activeTool === "spray"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Airbrush / Spray Can"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Spray</span>
              </button>

              {/* Straight Line */}
              <button
                type="button"
                onClick={() => setActiveTool("line")}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  activeTool === "line"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Straight Line Tool"
              >
                <Minus className="w-3.5 h-3.5 -rotate-45" />
                <span className="hidden sm:inline">Line</span>
              </button>

              {/* Shapes */}
              <button
                type="button"
                onClick={() => setActiveTool("shape")}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  activeTool === "shape"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Basic Shapes Tool"
              >
                <Square className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Shapes</span>
              </button>

              {/* Flood Fill (Paint Bucket) */}
              <button
                type="button"
                onClick={() => setActiveTool("fill")}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  activeTool === "fill"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Paint Bucket / Flood Fill"
              >
                <PaintBucket className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fill</span>
              </button>

              {/* Magnetic Lasso / Pen */}
              <button
                type="button"
                onClick={() => {
                  setActiveTool("lasso");
                  setLassoPoints([]);
                }}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  activeTool === "lasso"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Pen / Magnetic Lasso Tool"
              >
                <PenTool className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Pen Lasso</span>
              </button>

              {/* Eraser */}
              <button
                type="button"
                onClick={() => setActiveTool("eraser")}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  activeTool === "eraser"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Eraser"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Eraser</span>
              </button>
            </div>

            {/* Shape Sub-options (Only shown when activeTool === 'shape') */}
            {activeTool === "shape" && (
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 animate-fade-in">
                <button
                  type="button"
                  onClick={() => setShapeType("rect")}
                  className={`p-1 rounded-lg text-xs ${
                    shapeType === "rect" ? "bg-slate-700 text-white" : "text-slate-400"
                  }`}
                  title="Rectangle"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShapeType("circle")}
                  className={`p-1 rounded-lg text-xs ${
                    shapeType === "circle" ? "bg-slate-700 text-white" : "text-slate-400"
                  }`}
                  title="Circle / Ellipse"
                >
                  <Circle className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShapeType("triangle")}
                  className={`p-1 rounded-lg text-xs ${
                    shapeType === "triangle" ? "bg-slate-700 text-white" : "text-slate-400"
                  }`}
                  title="Triangle"
                >
                  <Triangle className="w-3.5 h-3.5" />
                </button>
                <div className="h-4 w-px bg-slate-700 mx-0.5" />
                {/* Shape Fill vs Outline Toggle */}
                <button
                  type="button"
                  onClick={() => setShapeFill(!shapeFill)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                    shapeFill
                      ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                      : "bg-slate-800 text-slate-300 border-slate-700"
                  }`}
                >
                  {shapeFill ? "⬛ Solid" : "🔲 Outline"}
                </button>
              </div>
            )}

            {/* Opacity Slider */}
            <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Opacity: {Math.round(opacity * 100)}%
              </span>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-16 md:w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Brush Sizes */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {BRUSH_SIZES.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setBrushSize(sz)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                    brushSize === sz
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title={`Size ${sz}px`}
                >
                  <span
                    className="rounded-full bg-current"
                    style={{ width: Math.max(3, sz / 2.5), height: Math.max(3, sz / 2.5) }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Color Palette */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c);
                  if (activeTool === "eraser") setActiveTool("brush");
                }}
                className={`w-6 h-6 rounded-lg border transition-all ${
                  color === c && activeTool !== "eraser"
                    ? "scale-110 border-white shadow-md ring-2 ring-indigo-500"
                    : "border-slate-700/60 hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}

            {/* Custom Color Input */}
            <div className="relative flex items-center">
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  if (activeTool === "eraser") setActiveTool("brush");
                }}
                className="w-6 h-6 rounded-lg border border-slate-700 cursor-pointer p-0 bg-transparent"
                title="Custom Color"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
