"use client";

import React, { useState } from "react";
import {
  ShoppingBag,
  Hammer,
  HelpCircle,
  AlertCircle,
  Coins,
  Shield,
  Layers,
  Sparkles,
  CheckCircle2,
  Lock,
  Eye,
  Info,
} from "lucide-react";
import { MastermindItem, MastermindPlayerInfo, AuctionSlot } from "../../../../party/types";
import {
  MASTER_ITEM_CATALOG,
  ItemDetail,
  getRecipesUsingItem,
} from "./oakhavenMapData";
import { OakhavenMap3D, OperativeToken } from "./OakhavenMap3D";

interface ShopAndCraftingProps {
  myPlayer: MastermindPlayerInfo;
  auctionSlots: AuctionSlot[];
  round: number;
  timer: number;
  selectedSectorId: string;
  onSelectSector: (sectorId: string) => void;
  tokens: OperativeToken[];
  vaultBreaches?: Record<string, boolean>;
  isFortified?: boolean;
  onBidAuction: (slotId: string, bidAmount: number) => void;
  onCraftItem: (resultItem: MastermindItem) => void;
  onClaimFreeCards: () => void;
}

export const ShopAndCrafting: React.FC<ShopAndCraftingProps> = ({
  myPlayer,
  auctionSlots,
  round,
  timer,
  selectedSectorId,
  onSelectSector,
  tokens,
  vaultBreaches,
  isFortified,
  onBidAuction,
  onCraftItem,
  onClaimFreeCards,
}) => {
  // State for hovered item (tooltip on card)
  const [hoveredItem, setHoveredItem] = useState<MastermindItem | null>(null);
  const [selectedBidSlotId, setSelectedBidSlotId] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(20);
  const [submittedBidSlotId, setSubmittedBidSlotId] = useState<string | null>(null);

  const wealthTaxMultiplier = myPlayer.wonAuctionLastRound ? 1.2 : 1.0;
  const effectiveCost = Math.round(bidAmount * wealthTaxMultiplier);

  const hoveredDetail = hoveredItem ? MASTER_ITEM_CATALOG[hoveredItem] : null;
  const possibleRecipes = hoveredItem ? getRecipesUsingItem(hoveredItem) : [];

  const handlePlaceBid = (slotId: string) => {
    if (myPlayer.coins < effectiveCost) {
      alert("Insufficient coins for this bid!");
      return;
    }
    onBidAuction(slotId, bidAmount);
    setSubmittedBidSlotId(slotId);
  };

  return (
    <div className="relative w-full h-full flex flex-col p-4 bg-slate-950 text-white rounded-3xl border border-cyan-500/30 overflow-hidden select-none">
      {/* Top Protocol Status Bar */}
      <div className="w-full flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-3 z-20">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300 font-mono text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>Phase 3: Tactical Procurement & Crafting Lab</span>
          </div>

          {/* Round 1 Free Ability Cards Banner */}
          {round === 1 && !myPlayer.unlockedNormalAbilities && (
            <button
              onClick={onClaimFreeCards}
              className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider animate-bounce shadow-lg shadow-amber-500/30 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              <span>Claim 2 Free Normal Ability Cards</span>
            </button>
          )}
        </div>

        {/* Wealth Tax & Currency Badge */}
        <div className="flex items-center gap-3">
          {myPlayer.wonAuctionLastRound && (
            <div className="px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-500/40 text-[10px] text-amber-300 font-bold flex items-center gap-1">
              <span>⚠️ +20% Wealth Tax Active</span>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900 border border-slate-800">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-sm font-black text-amber-300">
              {myPlayer.coins ?? myPlayer.cash ?? 50} <span className="text-[10px] text-slate-400">COINS</span>
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-400">Timer:</span>
            <span className="font-mono text-sm font-black text-cyan-300">{timer}s</span>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left Auction Hub | Center 3D Holographic Map | Right Inventory & Research */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* Left Column: Blind Auction Pool (Single-Purchase Limit) */}
        <div className="lg:col-span-3 flex flex-col gap-2.5 bg-slate-900/80 border border-slate-800 rounded-2xl p-3 overflow-y-auto">
          {/* AUCTION OPEN Banner */}
          <div className="flex items-center justify-center gap-2 py-1.5 rounded-xl bg-gradient-to-r from-cyan-950 to-slate-900 border border-cyan-400/50 animate-pulse mb-2">
            <span className="text-xs font-black text-cyan-300 uppercase tracking-widest">🔨 AUCTION OPEN</span>
          </div>

          {/* Wealth Tax badge at top of auction column if active */}
          {myPlayer.wonAuctionLastRound && (
            <div className="flex items-center justify-center gap-1.5 py-1 rounded-lg bg-rose-950/70 border border-rose-500/50 text-[10px] text-rose-300 font-bold">
              <span>⚠️ WEALTH TAX +20%</span>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-xs font-black tracking-wider text-cyan-300 uppercase">
              <ShoppingBag className="w-4 h-4 text-cyan-400" />
              <span>Secret Auction Slots</span>
            </div>
            <span className="text-[9px] text-slate-400 font-mono">Max 1 Win / Phase</span>
          </div>

          <div className="flex flex-col gap-2">
            {auctionSlots.map((slot) => {
              const itemInfo = MASTER_ITEM_CATALOG[slot.item] || {
                name: slot.name,
                icon: "📦",
                description: "Secret tactical gear",
              };
              const isSelected = selectedBidSlotId === slot.id;
              const isBidSubmitted = submittedBidSlotId === slot.id;
              const tierLabel = slot.type === "tier2" ? "High-Value Asset" : "Tier 1";

              return (
                <div
                  key={slot.id}
                  onClick={() => !isBidSubmitted && setSelectedBidSlotId(isSelected ? null : slot.id)}
                  className={`p-2.5 rounded-xl border flex flex-col gap-1.5 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-cyan-950/70 border-cyan-400 shadow-md shadow-cyan-950"
                      : "bg-slate-950 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{itemInfo.icon}</span>
                      <div>
                        <div className="text-sm font-black text-white truncate">{itemInfo.name}</div>
                        <span className="text-[9px] text-purple-400 uppercase font-mono tracking-wider">
                          {tierLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-0.5">
                        💰 {slot.basePrice}c
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 line-clamp-2">
                    {itemInfo.description}
                  </p>

                  {/* Bid submitted confirmation */}
                  {isBidSubmitted && (
                    <div className="text-[10px] font-black text-emerald-400 flex items-center gap-1 pt-1">
                      <CheckCircle2 className="w-3 h-3" />
                      ✓ BID LOCKED IN
                    </div>
                  )}

                  {/* Bid Input if selected & not yet submitted */}
                  {isSelected && !isBidSubmitted && (
                    <div className="pt-2 border-t border-slate-800 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Secret Bid:</span>
                        <span className="text-amber-400 font-bold">
                          {bidAmount}c {wealthTaxMultiplier > 1 && `(+20% = ${effectiveCost}c)`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={slot.basePrice}
                          max={Math.max(slot.basePrice + 30, myPlayer.coins || 60)}
                          value={bidAmount}
                          onChange={(e) => setBidAmount(Number(e.target.value))}
                          className="flex-1 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaceBid(slot.id);
                          }}
                          disabled={isBidSubmitted}
                          className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 rounded-lg text-[10px] font-black text-slate-950 uppercase flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3" />
                          🔒 PLACE BID
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Column: 3D Holographic Facility Map */}
        <div className="lg:col-span-6 relative flex flex-col rounded-2xl overflow-hidden border border-slate-800">
          <OakhavenMap3D
            selectedSectorId={selectedSectorId}
            onSelectSector={onSelectSector}
            tokens={tokens}
            vaultBreaches={vaultBreaches}
            isFortified={isFortified}
          />
        </div>

        {/* Right Column: Inventory & Interactive Hover Crafting Research Table */}
        <div className="lg:col-span-3 flex flex-col gap-2.5 bg-slate-900/80 border border-slate-800 rounded-2xl p-3 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-xs font-black tracking-wider text-purple-300 uppercase">
              <Hammer className="w-4 h-4 text-purple-400" />
              <span>Backpack & Research Lab</span>
            </div>
            <span className="text-[9px] text-slate-400 font-mono">Hover to Inspect</span>
          </div>

          {/* User's Owned Items Grid */}
          <div className="grid grid-cols-2 gap-3">
            {myPlayer.inventory.length === 0 ? (
              <div className="col-span-2 py-6 text-center text-xs text-slate-500 font-mono">
                Backpack is empty. Win components from the auction or forage sectors!
              </div>
            ) : (
              myPlayer.inventory.map((itemId, idx) => {
                const item = MASTER_ITEM_CATALOG[itemId];
                if (!item) return null;
                const isHovered = hoveredItem === itemId;

                return (
                  <div
                    key={`${itemId}-${idx}`}
                    onMouseEnter={() => setHoveredItem(itemId)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`relative p-2 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[80px] overflow-visible ${
                      isHovered
                        ? "bg-purple-950 border-purple-400 scale-105 shadow-md shadow-purple-900/60"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {/* Minimal tooltip */}
                    {isHovered && hoveredDetail && (
                      <div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-slate-900 border border-purple-500/50 rounded-xl p-2.5 z-50 shadow-2xl pointer-events-none"
                        style={{ backdropFilter: 'blur(8px)' }}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-base">{hoveredDetail.icon}</span>
                          <span className="text-xs font-black text-white">{hoveredDetail.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-300 leading-tight">{hoveredDetail.usageText}</p>
                        {possibleRecipes[0] && (
                          <div className="mt-1.5 pt-1 border-t border-slate-800 text-[10px] text-cyan-300 font-mono">
                            🔬 Craft: {possibleRecipes[0].icon} {possibleRecipes[0].name}
                          </div>
                        )}
                      </div>
                    )}

                    <span className="text-3xl mb-1.5">{item.icon}</span>
                    <span className="text-xs font-bold text-white truncate max-w-full">
                      {item.name}
                    </span>
                    <span className="text-[8px] text-slate-400 font-mono uppercase">
                      T{item.tier}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Empty state hint if no hover active */}
          {!hoveredItem && myPlayer.inventory.length > 0 && (
            <div className="mt-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center flex flex-col items-center justify-center text-slate-500">
              <Info className="w-5 h-5 mb-1 text-slate-600" />
              <span className="text-[11px] font-mono">
                Hover over any item in your backpack to inspect crafting formulas & component requirements.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
