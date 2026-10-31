export interface FortunePreset {
  category: string;
  phrases: string[];
}

export const FORTUNE_PRESETS: FortunePreset[] = [
  {
    category: "Blockbuster Movies",
    phrases: [
      "THE DARK KNIGHT",
      "AVENGERS ENDGAME",
      "INTERSTELLAR",
      "PIRATES OF THE CARIBBEAN",
      "JURASSIC PARK",
      "THE MATRIX",
      "BACK TO THE FUTURE",
      "STAR WARS THE EMPIRE STRIKES BACK",
      "SPIDER MAN NO WAY HOME",
      "HARRY POTTER AND THE SORCERERS STONE"
    ]
  },
  {
    category: "Video Games",
    phrases: [
      "THE LEGEND OF ZELDA",
      "MINECRAFT",
      "GRAND THEFT AUTO",
      "SUPER MARIO ODYSSEY",
      "CALL OF DUTY WARZONE",
      "CYBERPUNK TWENTY SEVENTY SEVEN",
      "RED DEAD REDEMPTION",
      "ROCKET LEAGUE",
      "VALORANT",
      "ELDEN RING"
    ]
  },
  {
    category: "Famous Sayings & Idioms",
    phrases: [
      "ACTIONS SPEAK LOUDER THAN WORDS",
      "A PIECE OF CAKE",
      "BREAK A LEG",
      "BITE THE BULLET",
      "BETTER LATE THAN NEVER",
      "NO PAIN NO GAIN",
      "PRACTICE MAKES PERFECT",
      "WHEN PIGS FLY",
      "THE EARLY BIRD CATCHES THE WORM"
    ]
  },
  {
    category: "Pop Culture & Songs",
    phrases: [
      "BOHEMIAN RHAPSODY",
      "STRANGER THINGS",
      "SQUID GAME",
      "BREAKING BAD",
      "THE SIMPSONS",
      "GAME OF THRONES",
      "MICHAEL JACKSON THRILLER"
    ]
  }
];

export function getRandomFortunePhrase(): { category: string; phrase: string } {
  const cat = FORTUNE_PRESETS[Math.floor(Math.random() * FORTUNE_PRESETS.length)];
  const phrase = cat.phrases[Math.floor(Math.random() * cat.phrases.length)];
  return { category: cat.category, phrase };
}

export function maskPhrase(phrase: string, revealedLetters: string[]): string {
  const upperRevealed = new Set(revealedLetters.map(l => l.toUpperCase()));
  return phrase
    .toUpperCase()
    .split("")
    .map(ch => {
      if (ch === " ") return " ";
      if (ch < "A" || ch > "Z") return ch; // punctuation stays visible
      if (upperRevealed.has(ch)) return ch;
      return "_";
    })
    .join(" ");
}

