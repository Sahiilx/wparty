"use client";

import React, { useState } from "react";
import { UserCheck, Sparkles, X } from "lucide-react";

interface ProfileModalProps {
  initialName: string;
  initialAvatar: string;
  isOpen: boolean;
  onSave: (name: string, avatar: string) => void;
  onClose?: () => void;
  title?: string;
  isFirstJoin?: boolean;
}

const AVATARS = ["🎨", "🦊", "🐱", "🐶", "🐼", "🦁", "🐸", "🦄", "🤖", "🚀", "🍕", "🎮", "👾", "👻", "👑", "🌮"];

export function ProfileModal({
  initialName,
  initialAvatar,
  isOpen,
  onSave,
  onClose,
  title = "Set Up Your Party Profile",
  isFirstJoin = false,
}: ProfileModalProps) {
  const [name, setName] = useState(initialName || "");
  const [avatar, setAvatar] = useState(initialAvatar || AVATARS[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || `Player_${Math.floor(1000 + Math.random() * 9000)}`;
    onSave(finalName, avatar);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
        {onClose && !isFirstJoin && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Customize Identity</span>
          </div>
          <h2 className="text-lg font-black text-white">{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Pick an avatar and nickname for your friends to see!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Grid */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Choose Avatar
            </label>
            <div className="grid grid-cols-8 gap-1.5 p-2 bg-slate-950/60 rounded-2xl border border-slate-800">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={`text-xl p-1 rounded-xl transition-all ${
                    avatar === emoji
                      ? "bg-indigo-600 scale-110 shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400"
                      : "hover:bg-slate-800 hover:scale-105"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Nickname Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Your Nickname
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">{avatar}</span>
              <input
                type="text"
                maxLength={16}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter nickname..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
          >
            <UserCheck className="w-4 h-4" />
            <span>{isFirstJoin ? "Enter Party Room" : "Save Changes"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

