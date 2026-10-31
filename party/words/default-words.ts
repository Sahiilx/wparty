export const DEFAULT_WORDS: string[] = [
  // Animals & Nature
  "cat", "dog", "elephant", "giraffe", "dolphin", "penguin", "lion", "tiger", "bear", "rabbit",
  "monkey", "kangaroo", "panda", "fox", "owl", "butterfly", "spider", "shark", "whale", "turtle",
  "tree", "flower", "mountain", "river", "ocean", "sun", "moon", "star", "cloud", "rainbow",
  "volcano", "desert", "island", "forest", "cactus", "lightning", "snowflake", "waterfall",

  // Food & Drinks
  "pizza", "burger", "taco", "sushi", "ice cream", "cookie", "cake", "apple", "banana", "watermelon",
  "coffee", "tea", "donut", "hot dog", "french fries", "cheese", "popcorn", "sandwich", "spaghetti",
  "pancake", "strawberry", "pineapple", "chocolate", "cupcake", "lollipop",

  // Everyday Objects & Tools
  "chair", "table", "bed", "lamp", "clock", "television", "computer", "phone", "book", "pencil",
  "scissors", "backpack", "umbrella", "glasses", "guitar", "piano", "drum", "camera", "key", "wallet",
  "mirror", "toothbrush", "headphones", "bicycle", "skateboard", "roller skates", "paintbrush",

  // Places & Buildings
  "castle", "lighthouse", "hospital", "school", "library", "airport", "pyramid", "bridge", "house",
  "tent", "igloo", "space station", "stadium", "supermarket", "cinema", "hotel",

  // People, Roles & Fantasy
  "pirate", "astronaut", "ninja", "wizard", "superhero", "robot", "alien", "ghost", "vampire",
  "zombie", "chef", "detective", "doctor", "firefighter", "police", "king", "queen", "clown", "mermaid",

  // Vehicles
  "car", "airplane", "rocket", "submarine", "helicopter", "train", "bus", "boat", "motorcycle",
  "hot air balloon", "tractor", "ambulance", "fire truck"
];

export function getRandomWords(count: number = 3): string[] {
  const shuffled = [...DEFAULT_WORDS].sort(() => 0.5 - Math.random());
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

