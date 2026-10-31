import { QuizQuestion } from '../types';

let _qid = 0;
function q(
  question: string,
  A: string, B: string, C: string, D: string,
  correct: 'A' | 'B' | 'C' | 'D',
  difficulty: 'easy' | 'medium' | 'hard',
  category: string
): QuizQuestion {
  return { id: `q${++_qid}`, question, options: { A, B, C, D }, correct, difficulty, category };
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // ==================== 🌍 GEOGRAPHY ====================
  // Easy
  q('What is the capital of France?', 'Berlin', 'Madrid', 'Paris', 'Rome', 'C', 'easy', '🌍 Geography'),
  q('What language is primarily spoken in Brazil?', 'Spanish', 'French', 'Portuguese', 'English', 'C', 'easy', '🌍 Geography'),
  q('What is the largest ocean on Earth?', 'Atlantic', 'Indian', 'Arctic', 'Pacific', 'D', 'easy', '🌍 Geography'),
  q('How many continents are there on Earth?', '5', '6', '7', '8', 'C', 'easy', '🌍 Geography'),
  q('Which country is home to the Eiffel Tower?', 'Italy', 'Germany', 'France', 'Spain', 'C', 'easy', '🌍 Geography'),
  q('Which continent is Egypt located on?', 'Asia', 'Africa', 'Europe', 'South America', 'B', 'easy', '🌍 Geography'),
  q('What is the capital of Japan?', 'Kyoto', 'Seoul', 'Tokyo', 'Beijing', 'C', 'easy', '🌍 Geography'),
  // Medium
  q('What is the longest river in the world?', 'Amazon', 'Nile', 'Yangtze', 'Mississippi', 'B', 'medium', '🌍 Geography'),
  q('Which country has the most natural lakes?', 'USA', 'Russia', 'Canada', 'Brazil', 'C', 'medium', '🌍 Geography'),
  q('What is the currency of Japan?', 'Won', 'Yuan', 'Yen', 'Ringgit', 'C', 'medium', '🌍 Geography'),
  q('What is the largest desert in the world?', 'Sahara', 'Arabian', 'Gobi', 'Antarctic', 'D', 'medium', '🌍 Geography'),
  q('Which ocean is the saltiest on average?', 'Pacific', 'Indian', 'Arctic', 'Atlantic', 'D', 'medium', '🌍 Geography'),
  q('Which mountain peak is the highest on Earth?', 'K2', 'Mount Everest', 'Kangchenjunga', 'Makalu', 'B', 'medium', '🌍 Geography'),
  q('What is the capital of Australia?', 'Sydney', 'Melbourne', 'Canberra', 'Brisbane', 'C', 'medium', '🌍 Geography'),
  // Hard
  q('What is the smallest independent state in the world?', 'Monaco', 'San Marino', 'Liechtenstein', 'Vatican City', 'D', 'hard', '🌍 Geography'),
  q('Which desert covers parts of China and Mongolia?', 'Kalahari', 'Mojave', 'Gobi', 'Atacama', 'C', 'hard', '🌍 Geography'),
  q('Which African country was formerly known as Abyssinia?', 'Kenya', 'Ethiopia', 'Somalia', 'Sudan', 'B', 'hard', '🌍 Geography'),
  q('What is the capital city of Turkey?', 'Istanbul', 'Izmir', 'Ankara', 'Antalya', 'C', 'hard', '🌍 Geography'),
  q('Which strait separates Spain and Morocco?', 'Strait of Malacca', 'Strait of Gibraltar', 'Bering Strait', 'Bosporus', 'B', 'hard', '🌍 Geography'),

  // ==================== 🔬 SCIENCE & TECH ====================
  // Easy
  q('What is H2O commonly known as?', 'Salt', 'Air', 'Water', 'Sugar', 'C', 'easy', '🔬 Science'),
  q('What planet is known as the Red Planet?', 'Venus', 'Jupiter', 'Mars', 'Saturn', 'C', 'easy', '🔬 Science'),
  q('What is the boiling point of pure water in Celsius?', '90°C', '80°C', '110°C', '100°C', 'D', 'easy', '🔬 Science'),
  q('What force pulls objects toward the center of the Earth?', 'Magnetism', 'Gravity', 'Friction', 'Inertia', 'B', 'easy', '🔬 Science'),
  q('What gas do humans need to breathe to live?', 'Carbon Dioxide', 'Nitrogen', 'Oxygen', 'Helium', 'C', 'easy', '🔬 Science'),
  q('Which of these is the center of an atom?', 'Electron', 'Photon', 'Nucleus', 'Quark', 'C', 'easy', '🔬 Science'),
  // Medium
  q('Which chemical element has the symbol "Au"?', 'Silver', 'Aluminum', 'Gold', 'Copper', 'C', 'medium', '🔬 Science'),
  q('How many bones are in the adult human body?', '196', '206', '216', '226', 'B', 'medium', '🔬 Science'),
  q('What is the approximate speed of light?', '200,000 km/s', '300,000 km/s', '250,000 km/s', '350,000 km/s', 'B', 'medium', '🔬 Science'),
  q('What is the chemical symbol for Iron?', 'Ir', 'In', 'Fe', 'Io', 'C', 'medium', '🔬 Science'),
  q('Which gas do plants absorb during photosynthesis?', 'Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen', 'C', 'medium', '🔬 Science'),
  q('What programming language was created by Guido van Rossum?', 'Ruby', 'Perl', 'Python', 'Java', 'C', 'medium', '💻 Tech'),
  q('What does CPU stand for in computers?', 'Central Process Utility', 'Central Processing Unit', 'Core Processing Unit', 'Computer Power Unit', 'B', 'medium', '💻 Tech'),
  // Hard
  q('What is the half-life of Carbon-14?', '3,730 years', '5,730 years', '7,730 years', '9,730 years', 'B', 'hard', '🔬 Science'),
  q('What is the atomic number of Gold?', '72', '74', '79', '82', 'C', 'hard', '🔬 Science'),
  q('What is the longest and strongest bone in the human body?', 'Tibia', 'Fibula', 'Femur', 'Humerus', 'C', 'hard', '🔬 Science'),
  q('Which element has the highest melting point of all metals?', 'Iron', 'Platinum', 'Tungsten', 'Titanium', 'C', 'hard', '🔬 Science'),
  q('What is the rarest human blood type?', 'AB-', 'O-', 'B-', 'A-', 'A', 'hard', '🔬 Science'),
  q('Which particle carries a negative electric charge?', 'Proton', 'Neutron', 'Electron', 'Positron', 'C', 'hard', '🔬 Science'),

  // ==================== 📚 HISTORY ====================
  // Easy
  q('Who was the first President of the United States?', 'Abraham Lincoln', 'Thomas Jefferson', 'George Washington', 'John Adams', 'C', 'easy', '📚 History'),
  q('Which ancient civilization built the Great Pyramids of Giza?', 'Romans', 'Greeks', 'Egyptians', 'Persians', 'C', 'easy', '📚 History'),
  q('In what year was the United States Declaration of Independence signed?', '1776', '1789', '1812', '1765', 'A', 'easy', '📚 History'),
  q('Who was known as the "Maid of Orléans"?', 'Marie Curie', 'Joan of Arc', 'Marie Antoinette', 'Queen Victoria', 'B', 'easy', '📚 History'),
  // Medium
  q('In what year did World War II end?', '1943', '1944', '1946', '1945', 'D', 'medium', '📚 History'),
  q('Who invented the telephone?', 'Thomas Edison', 'Nikola Tesla', 'Alexander Graham Bell', 'Albert Einstein', 'C', 'medium', '📚 History'),
  q('Who was the first human to walk on the Moon in 1969?', 'Buzz Aldrin', 'Neil Armstrong', 'Yuri Gagarin', 'Michael Collins', 'B', 'medium', '📚 History'),
  q('Who was the famous Queen of Ancient Egypt associated with Julius Caesar and Mark Antony?', 'Nefertiti', 'Hatshepsut', 'Cleopatra', 'Isis', 'C', 'medium', '📚 History'),
  q('Which empire was ruled by Julius Caesar?', 'Ottoman Empire', 'Roman Empire', 'Byzantine Empire', 'British Empire', 'B', 'medium', '📚 History'),
  // Hard
  q('In which year was the Magna Carta signed?', '1066', '1215', '1348', '1415', 'B', 'hard', '📚 History'),
  q('Which treaty officially brought an end to World War I in 1919?', 'Treaty of Paris', 'Treaty of Versailles', 'Treaty of Ghent', 'Treaty of Berlin', 'B', 'hard', '📚 History'),
  q('Who wrote the ancient Chinese military treatise "The Art of War"?', 'Confucius', 'Lao Tzu', 'Sun Tzu', 'Mencius', 'C', 'hard', '📚 History'),
  q('Which city was the capital of the Byzantine Empire?', 'Rome', 'Athens', 'Constantinople', 'Alexandria', 'C', 'hard', '📚 History'),
  q('In which year did the French Revolution begin?', '1776', '1789', '1799', '1804', 'B', 'hard', '📚 History'),

  // ==================== 📐 MATH ====================
  // Easy
  q('How many sides does a triangle have?', '2', '3', '4', '5', 'B', 'easy', '📐 Math'),
  q('What is 7 × 8?', '54', '56', '48', '63', 'B', 'easy', '📐 Math'),
  q('What is the smallest prime number?', '0', '1', '2', '3', 'C', 'easy', '📐 Math'),
  q('What is 100 divided by 4?', '20', '25', '30', '15', 'B', 'easy', '📐 Math'),
  q('How many degrees are in a full circle?', '180°', '270°', '360°', '90°', 'C', 'easy', '📐 Math'),
  // Medium
  q('What is the square root of 144?', '11', '14', '12', '13', 'C', 'medium', '📐 Math'),
  q('What is 15% of 200?', '20', '25', '30', '35', 'C', 'medium', '📐 Math'),
  q('What is the value of 2 raised to the power of 5 (2^5)?', '16', '32', '64', '25', 'B', 'medium', '📐 Math'),
  q('How many edges does a cube have?', '6', '8', '12', '16', 'C', 'medium', '📐 Math'),
  q('If a triangle has angles of 90° and 45°, what is the third angle?', '35°', '45°', '55°', '60°', 'B', 'medium', '📐 Math'),
  // Hard
  q('What is the value of Pi rounded to 4 decimal places?', '3.1415', '3.1416', '3.1413', '3.1418', 'B', 'hard', '📐 Math'),
  q('What is the mathematical term for a number divisible only by 1 and itself?', 'Composite', 'Prime', 'Rational', 'Integer', 'B', 'hard', '📐 Math'),
  q('In a Fibonacci sequence starting with 0, 1, 1, 2, 3, 5, what is the next number?', '7', '8', '9', '10', 'B', 'hard', '📐 Math'),
  q('What is the derivative of x^2 with respect to x?', 'x', '2x', '2', 'x^3 / 3', 'B', 'hard', '📐 Math'),
  q('What is 9 factorial (9!) divided by 8 factorial (8!)?', '8', '9', '72', '1', 'B', 'hard', '📐 Math'),

  // ==================== ⚽ SPORTS ====================
  // Easy
  q('In which sport do you score a "touchdown"?', 'Soccer', 'American Football', 'Rugby', 'Basketball', 'B', 'easy', '⚽ Sports'),
  q('How many players are on a standard soccer team on the pitch?', '9', '10', '11', '12', 'C', 'easy', '⚽ Sports'),
  q('Which sport uses a shuttlecock?', 'Tennis', 'Squash', 'Badminton', 'Table Tennis', 'C', 'easy', '⚽ Sports'),
  q('How many points is a free throw worth in basketball?', '1', '2', '3', '0.5', 'A', 'easy', '⚽ Sports'),
  // Medium
  q('In tennis, what score does the word "love" represent?', '15', '40', 'Zero', 'Game point', 'C', 'medium', '⚽ Sports'),
  q('How many players are on the court for one basketball team?', '4', '5', '6', '7', 'B', 'medium', '⚽ Sports'),
  q('Which country won the first FIFA World Cup in 1930?', 'Brazil', 'Argentina', 'Uruguay', 'Italy', 'C', 'medium', '⚽ Sports'),
  q('How many holes are played in a standard full round of golf?', '9', '12', '18', '24', 'C', 'medium', '⚽ Sports'),
  // Hard
  q('Who holds the world record for the 100m sprint at 9.58 seconds?', 'Tyson Gay', 'Yohan Blake', 'Usain Bolt', 'Carl Lewis', 'C', 'hard', '⚽ Sports'),
  q('Which country has won the most Cricket World Cup titles (ODI)?', 'India', 'West Indies', 'Australia', 'England', 'C', 'hard', '⚽ Sports'),
  q('In bowling, what are three consecutive strikes called?', 'A Triplet', 'A Turkey', 'A Hat-trick', 'A Clover', 'B', 'hard', '⚽ Sports'),
  q('What is the distance of an official marathon race in kilometers?', '40.0 km', '41.2 km', '42.195 km', '45.0 km', 'C', 'hard', '⚽ Sports'),

  // ==================== 🎨 ART & MUSIC ====================
  // Easy
  q('Who painted the Mona Lisa?', 'Picasso', 'Van Gogh', 'Leonardo da Vinci', 'Raphael', 'C', 'easy', '🎨 Art & Music'),
  q('What color do you get when you mix blue and yellow?', 'Purple', 'Green', 'Orange', 'Brown', 'B', 'easy', '🎨 Art & Music'),
  q('Which musical instrument has 88 keys?', 'Organ', 'Piano', 'Harpsichord', 'Accordion', 'B', 'easy', '🎨 Art & Music'),
  q('How many strings does a standard acoustic guitar have?', '4', '5', '6', '7', 'C', 'easy', '🎨 Art & Music'),
  // Medium
  q('Who wrote the tragedy "Romeo and Juliet"?', 'Charles Dickens', 'Jane Austen', 'William Shakespeare', 'Mark Twain', 'C', 'medium', '🎨 Art & Music'),
  q('Which Dutch artist painted "The Starry Night"?', 'Claude Monet', 'Pablo Picasso', 'Vincent van Gogh', 'Rembrandt', 'C', 'medium', '🎨 Art & Music'),
  q('How many completed symphonies did Ludwig van Beethoven compose?', '7', '8', '9', '10', 'C', 'medium', '🎨 Art & Music'),
  q('Which pop icon is known as the "King of Pop"?', 'Elvis Presley', 'Prince', 'Michael Jackson', 'David Bowie', 'C', 'medium', '🎨 Art & Music'),
  // Hard
  q('Who sculpted the famous Renaissance statue "David"?', 'Donatello', 'Michelangelo', 'Bernini', 'Rodin', 'B', 'hard', '🎨 Art & Music'),
  q('In which museum in Paris is the Mona Lisa on display?', 'Musée d’Orsay', 'Centre Pompidou', 'The Louvre', 'Musée Rodin', 'C', 'hard', '🎨 Art & Music'),
  q('Which Spanish artist was a co-founder of the Cubist movement?', 'Salvador Dalí', 'Francisco Goya', 'Pablo Picasso', 'Joan Miró', 'C', 'hard', '🎨 Art & Music'),
  q('Which composer wrote "The Four Seasons"?', 'J.S. Bach', 'Antonio Vivaldi', 'G.F. Handel', 'W.A. Mozart', 'B', 'hard', '🎨 Art & Music'),
];

const PRIZE_VALUES = [
  100, 200, 300, 500, 1_000,
  2_000, 4_000, 8_000, 16_000, 32_000,
  64_000, 125_000, 250_000, 500_000, 1_000_000,
];

const SAFE_HAVENS = [4, 9]; // 5th and 10th questions (0-indexed)

export function buildQuizRound(
  totalQuestions = 15,
  category = 'All',
  difficulty: 'progressive' | 'easy' | 'medium' | 'hard' | 'mixed' = 'progressive'
): QuizQuestion[] {
  let pool = QUIZ_QUESTIONS;

  if (category && category !== 'All') {
    const cleanCat = category.toLowerCase().replace(/[^a-z]/g, '');
    const filtered = pool.filter(q => q.category.toLowerCase().replace(/[^a-z]/g, '').includes(cleanCat));
    if (filtered.length >= 5) {
      pool = filtered;
    }
  }

  const easyPool = shuffle(pool.filter(q => q.difficulty === 'easy'));
  const medPool = shuffle(pool.filter(q => q.difficulty === 'medium'));
  const hardPool = shuffle(pool.filter(q => q.difficulty === 'hard'));

  const selected: QuizQuestion[] = [];

  if (difficulty === 'easy') {
    selected.push(...easyPool.slice(0, totalQuestions));
  } else if (difficulty === 'medium') {
    selected.push(...medPool.slice(0, totalQuestions));
  } else if (difficulty === 'hard') {
    selected.push(...hardPool.slice(0, totalQuestions));
  } else if (difficulty === 'mixed') {
    selected.push(...shuffle(pool).slice(0, totalQuestions));
  } else {
    // Progressive: 5 easy, 5 med, 5 hard
    const easyCount = Math.floor(totalQuestions / 3);
    const medCount = Math.floor(totalQuestions / 3);
    const hardCount = totalQuestions - easyCount - medCount;

    selected.push(...easyPool.slice(0, easyCount));
    selected.push(...medPool.slice(0, medCount));
    selected.push(...hardPool.slice(0, hardCount));
  }

  // If pool was smaller than needed, fill from all questions
  if (selected.length < totalQuestions) {
    const backup = shuffle(QUIZ_QUESTIONS);
    for (const item of backup) {
      if (selected.length >= totalQuestions) break;
      if (!selected.some(s => s.id === item.id)) {
        selected.push(item);
      }
    }
  }

  return selected.slice(0, totalQuestions);
}

export function getPrizeValues(): number[] {
  return [...PRIZE_VALUES];
}

export function getSafeHavens(): number[] {
  return [...SAFE_HAVENS];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
