# PartyHub 🎮 — Multiplayer Party Game Platform

A real-time multiplayer party game platform built with **Next.js (App Router)**, **Tailwind CSS**, and **PartyKit** (Serverless WebSockets).

Party up with friends using simple 4-letter room codes and play drawing, guessing, and telephone games directly in your browser.

---

## 🚀 Features

- **Party Lobby System**:
  - Instant room creation with 4-character codes (e.g., `K9XP`).
  - Shareable direct invite links (`/party/ABCD`).
  - Custom player nickname and avatar/emoji selector.
  - Host privileges (elects new host automatically if current host leaves).
  - Game switcher carousel (select which party game to launch).
- **Skribbl (Draw & Guess)**:
  - Turn-based drawer rotation with 3 random word choices.
  - Responsive HTML5 drawing board with normalized `0..1` coordinates (scales identically across desktop and mobile).
  - 12-color palette, 4 brush sizes, eraser tool, and full canvas clear.
  - Anti-cheat server: secret word is never sent to guessers over the network.
  - Masked word hints (`_ _ P _ E`) and countdown timer.
  - Live chat guessing with fuzzy matching (notifies user when they are 1 letter off).
  - Speed-based scoring system and podium with confetti celebration.
- **Modular Game Engine Architecture**:
  - Ready to plug in more party games (Gartic Phone, Codenames, Trivia) by adding modules under `party/games/` and `src/components/games/`.

---

## 💻 How to Run Locally

### 1. Start Both Servers (PartyKit + Next.js)

Open PowerShell in this directory:
```powershell
./run-dev.ps1
```

Or run them in two separate terminal tabs:

**Terminal 1 (PartyKit Realtime WebSocket Server):**
```bash
npm run party
```
*(Runs on `http://localhost:1999`)*

**Terminal 2 (Next.js Frontend):**
```bash
npm run dev
```
*(Runs on `http://localhost:3000`)*

---

## 🌐 Playing with Friends

1. Open `http://localhost:3000` in your browser.
2. Pick an avatar, type a nickname, and click **Create New Party**.
3. Copy the party link and open it in an Incognito tab or send it to friends on your local Wi-Fi.
4. Click **Start Game Now** to begin drawing and guessing!

