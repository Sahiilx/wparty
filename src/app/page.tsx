"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Gamepad2, Sparkles, Users, ArrowRight, Palette, PhoneCall } from "lucide-react";
import { ServerStatusBadge } from "@/components/common/ServerStatusBadge";

const AVATARS = ["🎨", "🦊", "🐱", "🐶", "🐼", "🦁", "🐸", "🦄", "🤖", "🚀", "🍕", "🎮", "👾", "👻", "👑", "🌮"];

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Restore saved profile
    const savedName = localStorage.getItem("party_player_name");
    const savedAvatar = localStorage.getItem("party_player_avatar");
    if (savedName) setName(savedName);
    if (savedAvatar) setAvatar(savedAvatar);
  }, []);

  const saveProfile = () => {
    const finalName = name.trim() || `Player_${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem("party_player_name", finalName);
    localStorage.setItem("party_player_avatar", avatar);
    localStorage.setItem("party_player_customized", "true");
    return finalName;
  };

  const generateRoomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No ambiguous chars
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateParty = () => {
    saveProfile();
    const code = generateRoomCode();
    router.push(`/party/${code}`);
  };

  const handleJoinParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError("Please enter a room code");
      return;
    }
    saveProfile();
    router.push(`/party/${joinCode.trim().toUpperCase()}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-4">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Hero Header */}
      <div className="text-center mb-8 relative z-10 flex flex-col items-center">
        <div className="flex items-center flex-wrap justify-center gap-2 mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>Real-time Multiplayer Party Hub</span>
          </div>
          <ServerStatusBadge compact />
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-2">
          Party<span className="text-indigo-400">Hub</span>
        </h1>
        <p className="text-slate-400 max-w-md mx-auto text-sm md:text-base mb-4">
          Party up with friends and play word guessing, drawing, and telephone games directly in your browser.
        </p>
        <div className="w-full max-w-md">
          <ServerStatusBadge />
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl relative z-10">
        {/* Avatar & Name Setup */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Choose Your Avatar
          </label>
          <div className="grid grid-cols-8 gap-2 mb-4 p-2 bg-slate-950/50 rounded-2xl border border-slate-800/80">
            {AVATARS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setAvatar(emoji)}
                className={`text-2xl p-1 rounded-xl transition-all ${
                  avatar === emoji
                    ? "bg-indigo-600 scale-110 shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400"
                    : "hover:bg-slate-800 hover:scale-105"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Your Nickname
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">{avatar}</span>
            <input
              type="text"
              maxLength={16}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter cool nickname..."
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={handleCreateParty}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 group transition-all"
          >
            <Gamepad2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span>Create New Party</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform ml-auto" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs text-slate-500 uppercase font-semibold">Or Join Room</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <form onSubmit={handleJoinParty} className="flex gap-2">
            <input
              type="text"
              maxLength={6}
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                setError("");
              }}
              placeholder="CODE"
              className="w-1/2 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-indigo-300 placeholder-slate-600 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <button
              type="submit"
              className="w-1/2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl flex items-center justify-center gap-2 border border-slate-700/50 transition-all"
            >
              <Users className="w-4 h-4" />
              <span>Join Party</span>
            </button>
          </form>
          {error && <p className="text-rose-400 text-xs text-center">{error}</p>}
        </div>
      </div>

      {/* Featured Games Showcase */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl w-full relative z-10">
        <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Skribbl (Draw & Guess)</h3>
            <p className="text-slate-400 text-xs">Take turns drawing secret words while friends race to guess in live chat.</p>
          </div>
        </div>

        <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Gartic Phone</h3>
            <p className="text-slate-400 text-xs">The hilarious telephone game: write prompts, draw sketches, and reveal the chaos.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

