import drawingWordsJson from "./drawing-words.json";
import fortunePhrasesJson from "./fortune-dialogues.json";
import imposterPairsJson from "./imposter-pairs.json";

export interface PhraseEntry {
  phrase: string;
  category: string;
  language?: 'English' | 'Hinglish' | 'French' | 'Spanish' | string;
  hint?: string;
}

export interface ImposterPair {
  secret: string;
  imposter: string;
}

// In-Memory Dynamic Caches initialized from bundled JSON
let drawingWordsCache: string[] = Array.isArray(drawingWordsJson) ? (drawingWordsJson as string[]) : [];
let fortunePhrasesCache: PhraseEntry[] = Array.isArray(fortunePhrasesJson) ? (fortunePhrasesJson as PhraseEntry[]) : [];
let imposterPairsCache: ImposterPair[] = Array.isArray(imposterPairsJson) ? (imposterPairsJson as ImposterPair[]) : [];

// Dynamic 12-hour live sync from GitHub raw URL
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/Sahiilx/wparty/main/party/words';

export async function refreshFromGitHub(): Promise<{ success: boolean; drawing: number; phrases: number; imposter: number }> {
  try {
    const drawingRes = await fetch(`${GITHUB_RAW_BASE}/drawing-words.json?t=${Date.now()}`);
    if (drawingRes.ok) {
      const items = await drawingRes.json() as string[];
      if (Array.isArray(items) && items.length > 0) {
        drawingWordsCache = items;
      }
    }
  } catch (e) {
    // Keep local cache
  }

  try {
    const fortuneRes = await fetch(`${GITHUB_RAW_BASE}/fortune-dialogues.json?t=${Date.now()}`);
    if (fortuneRes.ok) {
      const items = await fortuneRes.json() as PhraseEntry[];
      if (Array.isArray(items) && items.length > 0) {
        fortunePhrasesCache = items;
      }
    }
  } catch (e) {
    // Keep local cache
  }

  try {
    const imposterRes = await fetch(`${GITHUB_RAW_BASE}/imposter-pairs.json?t=${Date.now()}`);
    if (imposterRes.ok) {
      const items = await imposterRes.json() as ImposterPair[];
      if (Array.isArray(items) && items.length > 0) {
        imposterPairsCache = items;
      }
    }
  } catch (e) {
    // Keep local cache
  }

  return {
    success: true,
    drawing: drawingWordsCache.length,
    phrases: fortunePhrasesCache.length,
    imposter: imposterPairsCache.length,
  };
}

// Start auto-refresh interval only in Node.js server environment
if (typeof window === "undefined") {
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
  setInterval(() => {
    refreshFromGitHub().catch(() => {});
  }, TWELVE_HOURS_MS);
}

// Accessors
export function getDrawingWords(): string[] {
  return drawingWordsCache.length > 0 ? drawingWordsCache : ["apple", "banana", "pizza", "car", "house"];
}

export function getFortunePhrases(): PhraseEntry[] {
  return fortunePhrasesCache.length > 0 ? fortunePhrasesCache : [{ phrase: "MOGAMBO KHUSH HUA", category: "Bollywood" }];
}

export function getImposterPairs(): ImposterPair[] {
  return imposterPairsCache.length > 0 ? imposterPairsCache : [{ secret: "CHAI", imposter: "COFFEE" }];
}
