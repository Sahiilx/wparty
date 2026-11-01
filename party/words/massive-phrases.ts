export interface PhraseEntry {
  phrase: string;
  category: string;
  language?: 'English' | 'Hinglish' | 'French' | 'Spanish' | string;
  hint?: string;
}

export const MASSIVE_PHRASES: PhraseEntry[] = [
  // --- 🎬 MOVIES & TV SHOWS ---
  { phrase: "INCEPTION", category: "🎬 Movies & Shows", language: "English" },
  { phrase: "STRANGER THINGS", category: "🎬 Movies & Shows", language: "English" },
  { phrase: "BREAKING BAD", category: "🎬 Movies & Shows", language: "English" },
  { phrase: "GAME OF THRONES", category: "🎬 Movies & Shows", language: "English" },
  { phrase: "THE DARK KNIGHT", category: "🎬 Movies & Shows", language: "English" },
  { phrase: "INTERSTELLAR", category: "🎬 Movies & Shows", language: "English" },
  { phrase: "AVENGERS ENDGAME", category: "🎬 Movies & Shows", language: "English" },
  { phrase: "PULP FICTION", category: "🎬 Movies & Shows", language: "English" },
  { phrase: "FIGHT CLUB", category: "🎬 Movies & Shows", language: "English" },
  { phrase: "THE MATRIX", category: "🎬 Movies & Shows", language: "English" },
  { phrase: "JURASSIC PARK", category: "🎬 Movies & Shows", language: "English" },
  { phrase: "TITANIC", category: "🎬 Movies & Shows", language: "English" },
  { phrase: "FORREST GUMP", category: "🎬 Movies & Shows", language: "English" },
  { phrase: "SQUID GAME", category: "🎬 Movies & Shows", language: "English" },
  { phrase: "MONEY HEIST", category: "🎬 Movies & Shows", language: "English" },
  { phrase: "THE GODFATHER", category: "🎬 Movies & Shows", language: "English" },
  { phrase: "PEAKY BLINDERS", category: "🎬 Movies & Shows", language: "English" },
  { phrase: "SHERLOCK HOLMES", category: "🎬 Movies & Shows", language: "English" },
  { phrase: "THE LORD OF THE RINGS", category: "🎬 Movies & Shows", language: "English" },
  { phrase: "PIRATES OF THE CARIBBEAN", category: "🎬 Movies & Shows", language: "English" },

  // --- 🇮🇳 HINGLISH & BOLLYWOOD ---
  { phrase: "SHOLAY", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "Classic Bollywood blockbuster" },
  { phrase: "DILWALE DULHANIA LE JAYENGE", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "Iconic train love story" },
  { phrase: "MOGAMBO KHUSH HUA", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "Legendary Mr. India villain line" },
  { phrase: "KABHI KHUSHI KABHIE GHAM", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "It's all about loving your family" },
  { phrase: "RISHTEY MEIN TOH HUM TUMHARE BAAP LAGTE HAIN", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "Shahenshah punchline" },
  { phrase: "APNA TIME AAYEGA", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "Gully Boy anthem" },
  { phrase: "YE BABURAO KA STYLE HAI", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "Hera Pheri iconic comedy quote" },
  { phrase: "DON KO PAKADNA MUSHKIL HI NAHI NAMUMKIN HAI", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "Amitabh & SRK dialogue" },
  { phrase: "KITNE AADMI THE", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "Gabbar Singh iconic dialogue" },
  { phrase: "ZINDAGI NA MILEGI DOBARA", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "Spain road trip movie" },
  { phrase: "TAARE ZAMEEN PAR", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "Every child is special" },
  { phrase: "MUNNA BHAI MBBS", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "Jadu ki jhappi" },
  { phrase: "BALLE BALLE", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "Punjabi party phrase" },
  { phrase: "CHAI PE CHARCHA", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "Tea time discussions" },
  { phrase: "DIL CHAHTA HAI", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "Goa trip buddies" },
  { phrase: "EK THA TIGER", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "Spy action thriller" },
  { phrase: "GANGS OF WASSEYPUR", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "Faizal revenge saga" },
  { phrase: "PARAM SUNDARI", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "Hit dance song" },
  { phrase: "CHAK DE INDIA", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "Hockey team coach Shah Rukh" },
  { phrase: "BHAAG MILKHA BHAAG", category: "🇮🇳 Hinglish & Bollywood", language: "Hinglish", hint: "Flying Sikh biopic" },

  // --- 💬 FAMOUS QUOTES & DIALOGUES ---
  { phrase: "MAY THE FORCE BE WITH YOU", category: "💬 Iconic Dialogues", language: "English" },
  { phrase: "I WILL BE BACK", category: "💬 Iconic Dialogues", language: "English" },
  { phrase: "WINTER IS COMING", category: "💬 Iconic Dialogues", language: "English" },
  { phrase: "TO INFINITY AND BEYOND", category: "💬 Iconic Dialogues", language: "English" },
  { phrase: "SAY MY NAME", category: "💬 Iconic Dialogues", language: "English" },
  { phrase: "WHY SO SERIOUS", category: "💬 Iconic Dialogues", language: "English" },
  { phrase: "YOU SHALL NOT PASS", category: "💬 Iconic Dialogues", language: "English" },
  { phrase: "HERE IS JOHNNY", category: "💬 Iconic Dialogues", language: "English" },
  { phrase: "I AM IRON MAN", category: "💬 Iconic Dialogues", language: "English" },
  { phrase: "ELEMENTARY MY DEAR WATSON", category: "💬 Iconic Dialogues", language: "English" },
  { phrase: "LIFE IS LIKE A BOX OF CHOCOLATES", category: "💬 Iconic Dialogues", language: "English" },
  { phrase: "HOUSTON WE HAVE A PROBLEM", category: "💬 Iconic Dialogues", language: "English" },
  { phrase: "JUST DO IT", category: "💬 Iconic Dialogues", language: "English" },
  { phrase: "THINK DIFFERENT", category: "💬 Iconic Dialogues", language: "English" },

  // --- 🦸 ANIME, CARTOONS & CHARACTERS ---
  { phrase: "PIKACHU", category: "🦸 Anime & Characters", language: "English" },
  { phrase: "NARUTO UZUMAKI", category: "🦸 Anime & Characters", language: "English" },
  { phrase: "MONKEY D LUFFY", category: "🦸 Anime & Characters", language: "English" },
  { phrase: "SPONGEBOB SQUAREPANTS", category: "🦸 Anime & Characters", language: "English" },
  { phrase: "MICKEY MOUSE", category: "🦸 Anime & Characters", language: "English" },
  { phrase: "SCOOBY DOO", category: "🦸 Anime & Characters", language: "English" },
  { phrase: "OPTIMUS PRIME", category: "🦸 Anime & Characters", language: "English" },
  { phrase: "CAPTAIN JACK SPARROW", category: "🦸 Anime & Characters", language: "English" },
  { phrase: "SON GOKU", category: "🦸 Anime & Characters", language: "English" },
  { phrase: "SAITAMA ONE PUNCH MAN", category: "🦸 Anime & Characters", language: "English" },
  { phrase: "DORAEMON", category: "🦸 Anime & Characters", language: "English" },
  { phrase: "SHIN CHAN", category: "🦸 Anime & Characters", language: "English" },
  { phrase: "BUGS BUNNY", category: "🦸 Anime & Characters", language: "English" },
  { phrase: "WINNIE THE POOH", category: "🦸 Anime & Characters", language: "English" },
  { phrase: "TOM AND JERRY", category: "🦸 Anime & Characters", language: "English" },

  // --- 🍕 FOOD & CUISINE ---
  { phrase: "BUTTER CHICKEN", category: "🍕 Food & Cuisine", language: "Hinglish" },
  { phrase: "PANEER TIKKA", category: "🍕 Food & Cuisine", language: "Hinglish" },
  { phrase: "MASALA DOSA", category: "🍕 Food & Cuisine", language: "Hinglish" },
  { phrase: "CHAI AND SAMOSA", category: "🍕 Food & Cuisine", language: "Hinglish" },
  { phrase: "HYDERABADI BIRYANI", category: "🍕 Food & Cuisine", language: "Hinglish" },
  { phrase: "GOLGAPPA AND PANIPURI", category: "🍕 Food & Cuisine", language: "Hinglish" },
  { phrase: "GULAB JAMUN", category: "🍕 Food & Cuisine", language: "Hinglish" },
  { phrase: "PEPPERONI PIZZA", category: "🍕 Food & Cuisine", language: "English" },
  { phrase: "CHEESEBURGER AND FRIES", category: "🍕 Food & Cuisine", language: "English" },
  { phrase: "CHOCOLATE BROWNIE", category: "🍕 Food & Cuisine", language: "English" },
  { phrase: "SUSHI ROLL", category: "🍕 Food & Cuisine", language: "English" },
  { phrase: "SPAGHETTI CARBONARA", category: "🍕 Food & Cuisine", language: "English" },
  { phrase: "TACOS AL PASTOR", category: "🍕 Food & Cuisine", language: "Spanish" },
  { phrase: "CROISSANT", category: "🍕 Food & Cuisine", language: "French" },
  { phrase: "WAFFLES AND MAPLE SYRUP", category: "🍕 Food & Cuisine", language: "English" },

  // --- 🥄 UTENSILS & HOUSEHOLD OBJECTS ---
  { phrase: "PRESSURE COOKER", category: "🥄 Utensils & Objects", language: "English", hint: "Whistling kitchen tool" },
  { phrase: "ROLLING PIN", category: "🥄 Utensils & Objects", language: "English", hint: "Used for rolling dough / rotis" },
  { phrase: "ELECTRIC KETTLE", category: "🥄 Utensils & Objects", language: "English", hint: "Boils water instantly" },
  { phrase: "MICROWAVE OVEN", category: "🥄 Utensils & Objects", language: "English" },
  { phrase: "MAGNIFYING GLASS", category: "🥄 Utensils & Objects", language: "English" },
  { phrase: "TELESCOPE", category: "🥄 Utensils & Objects", language: "English" },
  { phrase: "FRYING PAN", category: "🥄 Utensils & Objects", language: "English" },
  { phrase: "CORKSCREW", category: "🥄 Utensils & Objects", language: "English" },
  { phrase: "BLENDER AND MIXER", category: "🥄 Utensils & Objects", language: "English" },
  { phrase: "TOASTER", category: "🥄 Utensils & Objects", language: "English" },
  { phrase: "ALARM CLOCK", category: "🥄 Utensils & Objects", language: "English" },
  { phrase: "THERMOS FLASK", category: "🥄 Utensils & Objects", language: "English" },
  { phrase: "CAN OPENER", category: "🥄 Utensils & Objects", language: "English" },
  { phrase: "CHOPPING BOARD", category: "🥄 Utensils & Objects", language: "English" },

  // --- 🇫🇷 FRENCH (Spelled in English Alphabet) ---
  { phrase: "CEST LA VIE", category: "🇫🇷 French Expressions", language: "French", hint: "That's life" },
  { phrase: "BON APPETIT", category: "🇫🇷 French Expressions", language: "French", hint: "Enjoy your meal" },
  { phrase: "DEJA VU", category: "🇫🇷 French Expressions", language: "French", hint: "Feeling of having seen this before" },
  { phrase: "VOILA", category: "🇫🇷 French Expressions", language: "French", hint: "There it is!" },
  { phrase: "COUP D ETAT", category: "🇫🇷 French Expressions", language: "French", hint: "Sudden overthrow" },
  { phrase: "JE NE SAIS QUOI", category: "🇫🇷 French Expressions", language: "French", hint: "An indefinable special quality" },
  { phrase: "RENDEZ VOUS", category: "🇫🇷 French Expressions", language: "French", hint: "An agreed meeting" },
  { phrase: "EN ROUTE", category: "🇫🇷 French Expressions", language: "French", hint: "On the way" },
  { phrase: "TOUR DE FRANCE", category: "🇫🇷 French Expressions", language: "French", hint: "Famous bicycle race" },
  { phrase: "AU REVOIR", category: "🇫🇷 French Expressions", language: "French", hint: "Goodbye until we meet again" },

  // --- 🇪🇸 SPANISH (Spelled in English Alphabet) ---
  { phrase: "HASTA LA VISTA", category: "🇪🇸 Spanish Expressions", language: "Spanish", hint: "See you later" },
  { phrase: "MI CASA ES SU CASA", category: "🇪🇸 Spanish Expressions", language: "Spanish", hint: "My house is your house" },
  { phrase: "FELIZ NAVIDAD", category: "🇪🇸 Spanish Expressions", language: "Spanish", hint: "Merry Christmas" },
  { phrase: "VIVA LA VIDA", category: "🇪🇸 Spanish Expressions", language: "Spanish", hint: "Long live life" },
  { phrase: "AMIGO", category: "🇪🇸 Spanish Expressions", language: "Spanish", hint: "Friend" },
  { phrase: "BUENOS DIAS", category: "🇪🇸 Spanish Expressions", language: "Spanish", hint: "Good morning" },
  { phrase: "FIESTA", category: "🇪🇸 Spanish Expressions", language: "Spanish", hint: "Party or festival" },
  { phrase: "DESPACITO", category: "🇪🇸 Spanish Expressions", language: "Spanish", hint: "Slowly" },

  // --- 💡 EVERYDAY IDIOMS & SAYINGS ---
  { phrase: "PIECE OF CAKE", category: "💡 Everyday Idioms", language: "English" },
  { phrase: "BREAK A LEG", category: "💡 Everyday Idioms", language: "English" },
  { phrase: "ONCE IN A BLUE MOON", category: "💡 Everyday Idioms", language: "English" },
  { phrase: "BITE THE BULLET", category: "💡 Everyday Idioms", language: "English" },
  { phrase: "BLESSING IN DISGUISE", category: "💡 Everyday Idioms", language: "English" },
  { phrase: "BETTER LATE THAN NEVER", category: "💡 Everyday Idioms", language: "English" },
  { phrase: "CALL IT A DAY", category: "💡 Everyday Idioms", language: "English" },
  { phrase: "TIME FLIES WHEN HAVING FUN", category: "💡 Everyday Idioms", language: "English" },
  { phrase: "UNDER THE WEATHER", category: "💡 Everyday Idioms", language: "English" },
  { phrase: "SPILL THE BEANS", category: "💡 Everyday Idioms", language: "English" }
];

import { getFortunePhrases } from "./word-manager";

export function getAllPhrases(): PhraseEntry[] {
  const dynamic = getFortunePhrases();
  const map = new Map<string, PhraseEntry>();
  for (const p of MASSIVE_PHRASES) map.set(p.phrase.toUpperCase(), p);
  for (const p of dynamic) map.set(p.phrase.toUpperCase(), p);
  return Array.from(map.values());
}

export function getRandomPhrase(language?: string, category?: string): PhraseEntry {
  const all = getAllPhrases();
  let filtered = all;

  if (language && language !== "All") {
    filtered = filtered.filter(p => (p.language || "English").toLowerCase() === language.toLowerCase());
  }

  if (category && category !== "All") {
    filtered = filtered.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
  }

  if (filtered.length === 0) {
    filtered = all;
  }

  const pick = filtered[Math.floor(Math.random() * filtered.length)];
  return pick;
}

