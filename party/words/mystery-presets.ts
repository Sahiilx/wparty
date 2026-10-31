export interface MysteryPreset {
  name: string;
  category: string;
  imageUrl: string;
  hint: string;
}

export const MYSTERY_PRESETS: MysteryPreset[] = [
  // Gaming Characters
  {
    name: "Pikachu",
    category: "Pokemon",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
    hint: "Electric mouse Pokemon"
  },
  {
    name: "Charizard",
    category: "Pokemon",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png",
    hint: "Fire/Flying dragon Pokemon"
  },
  {
    name: "Gengar",
    category: "Pokemon",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png",
    hint: "Shadow Ghost Pokemon"
  },
  {
    name: "Sonic",
    category: "Video Games",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/2/2d/Sonic_the_Hedgehog_2019.png/220px-Sonic_the_Hedgehog_2019.png",
    hint: "The Blue Blur"
  },
  {
    name: "Pac-Man",
    category: "Video Games",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/b/b5/Pac-Man_%28character%29.png",
    hint: "Yellow arcade ghost eater"
  },

  // Famous Logos
  {
    name: "Apple",
    category: "Famous Brands & Logos",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/200px-Apple_logo_black.svg.png",
    hint: "Tech giant fruit logo"
  },
  {
    name: "Nike",
    category: "Famous Brands & Logos",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/250px-Logo_NIKE.svg.png",
    hint: "Just Do It swoosh"
  },
  {
    name: "McDonald's",
    category: "Famous Brands & Logos",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/McDonald%27s_Golden_Arches.svg/200px-McDonald%27s_Golden_Arches.svg.png",
    hint: "Golden Arches fast food"
  },
  {
    name: "Twitter",
    category: "Famous Brands & Logos",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Logo_of_Twitter.svg/220px-Logo_of_Twitter.svg.png",
    hint: "Blue bird social network"
  },

  // Pop Culture & Cartoons
  {
    name: "Spider-Man",
    category: "Superheroes",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/2/21/Web_of_Spider-Man_Vol_1_129-1.png",
    hint: "Friendly neighborhood web-slinger"
  },
  {
    name: "Batman",
    category: "Superheroes",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/c/c7/Batman_Infobox.jpg",
    hint: "The Dark Knight of Gotham"
  },
  {
    name: "SpongeBob",
    category: "Cartoons & Anime",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/3/3b/SpongeBob_SquarePants_character.svg/220px-SpongeBob_SquarePants_character.svg.png",
    hint: "Lives in a pineapple under the sea"
  }
];

