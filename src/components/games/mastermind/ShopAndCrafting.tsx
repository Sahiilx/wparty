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
  onBuyItem: (item: MastermindItem) => void;
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
  onBuyItem,
  onCraftItem,
  onClaimFreeCards,
}) => {
  const [shopTab, setShopTab] = useState<'market' | 'auction'>('market');
  const [hoveredItem, setHoveredItem] = useState<MastermindItem | null>(null);
  const [selectedBidSlotId, setSelectedBidSlotId] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(20);
  const [submittedBidSlotId, setSubmittedBidSlotId] = useState<string | null>(null);
  const [buyFeedback, setBuyFeedback] = useState<string | null>(null);

  const DIRECT_MARKET_ITEMS: Array<{ item: MastermindItem; name: string; icon: string; price: number; desc: string; isTier1?: boolean }> = [
    { item: 'battery', name: 'Battery', icon: '🔋', price: 15, desc: 'Power cell for electronic gear & scanners' },
    { item: 'micro_cipher', name: 'Micro-Cipher', icon: '💾', price: 15, desc: 'Decryption chip for cracking security terminals' },
    { item: 'chemical_solvent', name: 'Solvent', icon: '🧪', price: 12, desc: 'Corrosive chemical compound for synthesis' },
    { item: 'volatile_powder', name: 'Volatile Powder', icon: '💥', price: 14, desc: 'Explosive precursor reagent' },
    { item: 'steel_frame', name: 'Steel Frame', icon: '🔩', price: 15, desc: 'Heavy structural alloy for armor plating' },
    { item: 'bio_sample', name: 'Bio-Sample', icon: '🧬', price: 14, desc: 'Medical precursor culture vial' },
    { item: 'scrap_metal', name: 'Scrap Metal', icon: '⚙️', price: 10, desc: 'Ductile iron plating scrap' },
    { item: 'flashlight', name: 'Flashlight', icon: '🔦', price: 10, desc: 'Illumination beam for dark sectors' },
    { item: 'optical_scanner', name: 'Optical Scanner', icon: '🔍', price: 35, desc: 'Tier 1 device: scans room occupancy', isTier1: true },
    { item: 'corrosive_lockpick', name: 'Corrosive Pick', icon: '🗝️', price: 35, desc: 'Tier 1 tool: melts emergency door locks', isTier1: true },
    { item: 'improvised_kevlar', name: 'Kevlar Vest', icon: '🦺', price: 35, desc: 'Tier 1 armor: absorbs 1 physical attack', isTier1: true },
    { item: 'tripwire_mine', name: 'Tripwire Mine', icon: '💣', price: 35, desc: 'Tier 1 trap: injures intruders', isTier1: true },
  ];

  const handleDirectBuy = (item: MastermindItem, price: number, name: string) => {
    if (myPlayer.coins < price) {
      alert("Insufficient coins to purchase this item!");
      return;
    }
    onBuyItem(item);
    setBuyFeedback(`Purchased ${name}!`);
    setTimeout(() => setBuyFeedback(null), 1800);
  };

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
        {/* Left Column: Direct Market + Secret Tier 3 Auction */}
        <div className="lg:col-span-3 flex flex-col gap-2.5 bg-slate-900/80 border border-slate-800 rounded-2xl p-3 overflow-y-auto">
          {/* Shop Mode Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setShopTab('market')}
              className={`py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                shopTab === 'market'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Direct Market
            </button>
            <button
              onClick={() => setShopTab('auction')}
              className={`py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1 ${
                shopTab === 'auction'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🔨 Tier 3 Auction</span>
            </button>
          </div>

          {/* Feedback message */}
          {buyFeedback && (
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-bold text-center animate-bounce">
              ✓ {buyFeedback}
            </div>
          )}

          {/* TAB 1: DIRECT MARKET (Raw components & Tier 1/2 parts) */}
          {shopTab === 'market' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="text-[10px] font-mono text-cyan-300 uppercase font-black">
                  Instant Procurement
                </span>
                <span className="text-[9px] text-slate-500 font-mono">No Bidding Required</span>
              </div>

              <div className="flex flex-col gap-1.5">
                {DIRECT_MARKET_ITEMS.map((entry) => {
                  const canAfford = myPlayer.coins >= entry.price;
                  return (
                    <div
                      key={entry.item}
                      className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-2 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl shrink-0">{entry.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span>{entry.name}</span>
                            {entry.isTier1 && (
                              <span className="text-[8px] px-1 rounded bg-purple-950 text-purple-300 border border-purple-500/40">
                                T1
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 line-clamp-1">
                            {entry.desc}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDirectBuy(entry.item, entry.price, entry.name)}
                        disabled={!canAfford}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shrink-0 transition flex items-center gap-1 ${
                          canAfford
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 shadow-sm'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <span>{entry.price}c</span>
                        <span>BUY</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: SECRET AUCTION (TIER 3 APEX ONLY) */}
          {shopTab === 'auction' && (
            <div className="flex flex-col gap-2">
              {/* Wealth Tax badge at top of auction column if active */}
              {myPlayer.wonAuctionLastRound && (
                <div className="flex items-center justify-center gap-1.5 py-1 rounded-lg bg-rose-950/70 border border-rose-500/50 text-[10px] text-rose-300 font-bold">
                  <span>⚠️ WEALTH TAX +20%</span>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-black tracking-wider text-amber-300 uppercase">
                  <span>Apex Tier 3 Auction</span>
                </div>
                <span className="text-[9px] text-slate-400 font-mono">Max 1 Win / Phase</span>
              </div>

              <div className="flex flex-col gap-2">
                {auctionSlots.map((slot) => {
                  const itemInfo = MASTER_ITEM_CATALOG[slot.item] || {
                    name: slot.name,
                    icon: "👑",
                    description: "Apex game-ending component",
                  };
                  const isSelected = selectedBidSlotId === slot.id;
                  const isBidSubmitted = submittedBidSlotId === slot.id;

                  return (
                    <div
                      key={slot.id}
                      onClick={() => !isBidSubmitted && setSelectedBidSlotId(isSelected ? null : slot.id)}
                      className={`p-2.5 rounded-xl border flex flex-col gap-1.5 cursor-pointer transition-all ${
                        isSelected
                          ? "bg-amber-950/70 border-amber-400 shadow-md shadow-amber-950"
                          : "bg-slate-950 border-slate-800/80 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-3xl">{itemInfo.icon}</span>
                          <div>
                            <div className="text-sm font-black text-amber-300 truncate">{itemInfo.name}</div>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-200 uppercase font-mono font-bold tracking-wider border border-amber-500/40">
                              Tier 3 Apex
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
                          ✓ SECRET BID LOCKED IN
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
                              max={Math.max(slot.basePrice + 40, myPlayer.coins || 80)}
                              value={bidAmount}
                              onChange={(e) => setBidAmount(Number(e.target.value))}
                              className="flex-1 accent-amber-400 h-1.5 bg-slate-800 rounded-lg"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlaceBid(slot.id);
                              }}
                              disabled={isBidSubmitted}
                              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 rounded-lg text-[10px] font-black text-slate-950 uppercase flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3" />
                              🔒 BID
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
          <div className="grid grid-cols-3 gap-2">
            {myPlayer.inventory.length === 0 ? (
              <div className="col-span-3 py-6 text-center text-xs text-slate-500 font-mono">
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
                    className={`relative p-2 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all ${isHovered
                      ? "bg-purple-950 border-purple-400 scale-105 shadow-md shadow-purple-900/60"
                      : "bg-slate-950 border-slate-800 hover:border-slate-700"
                      }`}
                  >
                    <span className="text-2xl mb-1">{item.icon}</span>
                    <span className="text-[10px] font-bold text-white truncate max-w-full">
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

          {/* INTERACTIVE HOVER RESEARCH BLUEPRINT POPUP */}
          {hoveredDetail ? (
            <div className="mt-2 p-3 rounded-2xl bg-slate-950 border border-purple-500/40 shadow-xl flex flex-col gap-2 animate-fade-in">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="text-2xl">{hoveredDetail.icon}</span>
                <div>
                  <div className="text-xs font-black text-purple-300">{hoveredDetail.name}</div>
                  <div className="text-[9px] text-slate-400 font-mono">{hoveredDetail.description}</div>
                </div>
              </div>

              {/* Usage text below it as requested */}
              <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/20 text-[10px] text-purple-200">
                <span className="font-bold">Usage: </span>
                <span>{hoveredDetail.usageText}</span>
              </div>

              {/* Recipes that use this item */}
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="text-[10px] font-black uppercase text-cyan-300 tracking-wider">
                  Synthesizable With This Item:
                </span>

                {possibleRecipes.length === 0 ? (
                  <span className="text-[10px] text-slate-500 italic">No direct craft paths found.</span>
                ) : (
                  possibleRecipes.map((recipe) => {
                    // Check if player has all required components
                    const canCraft = recipe.components?.every((comp) =>
                      myPlayer.inventory.includes(comp)
                    );

                    return (
                      <div
                        key={recipe.id}
                        className={`p-2 rounded-xl border flex flex-col gap-1 transition-all ${canCraft
                          ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
                          : "bg-slate-900/60 border-slate-800 text-slate-400"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{recipe.icon}</span>
                            <span>{recipe.name}</span>
                          </span>
                          {canCraft && (
                            <button
                              onClick={() => onCraftItem(recipe.id)}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-[9px] uppercase rounded-md shadow"
                            >
                              Craft
                            </button>
                          )}
                        </div>

                        {/* Components breakdown: owned = normal, missing = dimmed/greyed out */}
                        <div className="flex items-center gap-1 flex-wrap mt-0.5">
                          {recipe.components?.map((reqItem, cIdx) => {
                            const reqInfo = MASTER_ITEM_CATALOG[reqItem];
                            const isOwned = myPlayer.inventory.includes(reqItem);

                            return (
                              <span
                                key={cIdx}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono flex items-center gap-1 border ${isOwned
                                  ? "bg-slate-800 border-cyan-400/60 text-cyan-300 font-bold"
                                  : "bg-slate-950 border-slate-800 text-slate-600 opacity-40 line-through"
                                  }`}
                              >
                                <span>{reqInfo?.icon || "⚙️"}</span>
                                <span>{reqInfo?.name || reqItem}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center flex flex-col items-center justify-center text-slate-500">
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

