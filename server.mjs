import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import next from "next";
import { WebSocketServer } from "ws";
import esbuild from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = Number.parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";

console.log(`[PartyHub Server] Starting in ${dev ? "development" : "production"} mode on port ${port}...`);

// 1. In-Memory Bundle of PartyKit Game Engine (Zero disk writes, instant)
let PartyServerClass;
try {
  const partyEntry = path.join(__dirname, "party", "index.ts");
  const res = esbuild.buildSync({
    entryPoints: [partyEntry],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
  });
  const codeBase64 = Buffer.from(res.outputFiles[0].text).toString("base64");
  const moduleUri = `data:text/javascript;base64,${codeBase64}`;
  const imported = await import(moduleUri);
  PartyServerClass = imported.default;
  console.log("[PartyHub Server] Loaded game engine successfully (7 party modes ready).");
} catch (err) {
  console.error("[PartyHub Server] Failed to load party engine:", err);
  process.exit(1);
}

// 2. Next.js App Initialization
const nextApp = next({ dev, dir: __dirname });
const nextHandler = nextApp.getRequestHandler();
await nextApp.prepare();

// 3. Room Management
const rooms = new Map(); // roomCode -> { instance, connections: Set, id: roomCode }

function getOrCreateRoom(roomCode) {
  const code = roomCode.toUpperCase();
  let r = rooms.get(code);
  if (!r) {
    const connections = new Set();
    const roomObj = {
      id: code,
      broadcast(data) {
        const payload = typeof data === "string" ? data : JSON.stringify(data);
        for (const conn of connections) {
          if (conn.ws.readyState === 1 /* WebSocket.OPEN */) {
            conn.ws.send(payload);
          }
        }
      },
      getConnections() {
        return connections.values();
      },
    };

    const instance = new PartyServerClass(roomObj);
    r = { room: roomObj, instance, connections };
    rooms.set(code, r);
  }
  return r;
}

// 4. HTTP & WebSocket Server
const server = http.createServer(async (req, res) => {
  // Fast health check endpoint (used by frontend wakeup badge & Render monitoring)
  if (req.url === "/api/health" || req.url === "/health") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(
      JSON.stringify({
        status: "ok",
        online: true,
        uptime: Math.floor(process.uptime()),
        timestamp: Date.now(),
        activeRooms: rooms.size,
        server: "PartyHub Unified Node Engine",
      })
    );
    return;
  }

  // Pass all other HTTP requests to Next.js
  nextHandler(req, res);
});

// WebSocket Upgrade Handler
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = req.url || "";
  console.log(`[PartyHub Server] Incoming WebSocket upgrade: ${url}`);
  // Match PartySocket URLs like /parties/main/ROOM1 or /party/ROOM1
  const match = url.match(/parties\/[^/]+\/([^/?#]+)/) || url.match(/party\/([^/?#]+)/);

  if (match) {
    const roomCode = match[1].toUpperCase();
    console.log(`[PartyHub Server] Routing client to room: ${roomCode}`);
    wss.handleUpgrade(req, socket, head, (ws) => {
      const r = getOrCreateRoom(roomCode);
      const reqUrl = new URL(url, "http://localhost");
      const connId = reqUrl.searchParams.get("_pk") || Math.random().toString(36).slice(2, 10);

      const conn = {
        id: connId,
        send(msg) {
          if (ws.readyState === 1 /* OPEN */) {
            ws.send(typeof msg === "string" ? msg : JSON.stringify(msg));
          }
        },
        ws,
      };

      r.connections.add(conn);

      try {
        r.instance.onConnect(conn, { request: req });
      } catch (err) {
        console.error(`[PartyHub Server] Error in onConnect for room ${roomCode}:`, err);
      }

      ws.on("message", (data) => {
        try {
          r.instance.onMessage(data.toString(), conn);
        } catch (err) {
          console.error(`[PartyHub Server] Error in onMessage for room ${roomCode}:`, err);
        }
      });

      ws.on("close", () => {
        r.connections.delete(conn);
        try {
          r.instance.onClose(conn);
        } catch (err) {
          console.error(`[PartyHub Server] Error in onClose for room ${roomCode}:`, err);
        }

        // Clean up empty room if no players remain after 30s
        if (r.connections.size === 0) {
          setTimeout(() => {
            if (r.connections.size === 0) {
              if (r.instance.stopTicker) r.instance.stopTicker();
              rooms.delete(code);
            }
          }, 30000);
        }
      });
    });
  } else {
    socket.destroy();
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`[PartyHub Server] ✓ Ready! Web & WebSockets listening on 0.0.0.0:${port}`);
});

