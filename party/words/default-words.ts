import { getDrawingWords } from "./word-manager";

export const DEFAULT_WORDS: string[] = [
  "cat", "dog", "elephant", "giraffe", "dolphin", "penguin", "lion", "tiger", "bear", "rabbit",
  "monkey", "kangaroo", "panda", "fox", "owl", "butterfly", "spider", "shark", "whale", "turtle",
  "pizza", "burger", "taco", "sushi", "ice cream", "cookie", "cake", "apple", "banana", "watermelon",
  "coffee", "tea", "donut", "hot dog", "french fries", "cheese", "popcorn", "sandwich", "spaghetti",
  "chair", "table", "bed", "lamp", "clock", "television", "computer", "phone", "book", "pencil",
  "scissors", "backpack", "umbrella", "glasses", "guitar", "piano", "drum", "camera", "key", "wallet",
  "samosa", "chai", "biryani", "gulab jamun", "dosa", "pani puri", "jalebi", "naan", "pakora",
  "cricket bat", "auto rickshaw", "taj mahal", "diya", "tabla", "flute", "spiderman", "batman",
  "lightsaber", "pokeball", "mario", "pikachu", "doraemon", "shinchan", "shrek"
];

export function getRandomWords(count: number = 3): string[] {
  const pool = getDrawingWords().length > 0 ? getDrawingWords() : DEFAULT_WORDS;
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function maskWord(word: string, revealedLetters: Set<number> = new Set()): string {
  return word
    .split("")
    .map((char, index) => {
      if (char === " ") return " ";
      if (revealedLetters.has(index)) return char.toUpperCase();
      return "_";
    })
    .join(" ");
}

export function isCloseGuess(guess: string, target: string): boolean {
  const g = guess.trim().toLowerCase();
  const t = target.trim().toLowerCase();
  if (g === t) return false;
  if (Math.abs(g.length - t.length) > 1) return false;

  let differences = 0;
  let i = 0;
  let j = 0;

  while (i < g.length && j < t.length) {
    if (g[i] !== t[j]) {
      differences++;
      if (differences > 1) return false;
      if (g.length > t.length) i++;
      else if (t.length > g.length) j++;
      else { i++; j++; }
    } else {
      i++;
      j++;
    }
  }
  return true;
}
