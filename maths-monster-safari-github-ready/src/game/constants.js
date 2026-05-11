export const SCENES = {
  PATHWAY: 'pathway',
  HUB: 'hub',
  SAFARI: 'safari',
};

export const LANES = [-3.2, 0, 3.2];

export const PORTAL_COIN_COST = 15;

export const TROPHY_LEVELS = [
  { id: 'bronze', label: 'Bronze Cup', correct: 5 },
  { id: 'silver', label: 'Silver Cup', correct: 12 },
  { id: 'gold', label: 'Gold Cup', correct: 25 },
];

export const FOOD_TYPES = {
  pizza: { label: 'Pizza', color: '#f1b84b', growth: 2, eggPower: 1 },
  heart: { label: 'Blue heart', color: '#40b7ff', growth: 3, eggPower: 1 },
  pig: { label: 'Pig', color: '#f7a3bc', growth: 4, eggPower: 2 },
  fish: { label: 'Fish', color: '#68c7d9', growth: 3, eggPower: 1 },
  meat: { label: 'Bone meat', color: '#d16552', growth: 5, eggPower: 2 },
};

export const COLLECTIBLE_TYPES = {
  coin: { label: 'Coin', color: '#f5c84b', value: 1 },
  pizza: FOOD_TYPES.pizza,
  heart: FOOD_TYPES.heart,
  pig: FOOD_TYPES.pig,
  fish: FOOD_TYPES.fish,
  meat: FOOD_TYPES.meat,
};

export const EGG_BLUEPRINTS = [
  { id: 'leaf', label: 'Leaf Egg', food: 'fish', needed: 3, color: '#82d173', monster: 'Moss Munch' },
  { id: 'spark', label: 'Spark Egg', food: 'pizza', needed: 3, color: '#f3ca52', monster: 'Crackle Cub' },
  { id: 'bubble', label: 'Bubble Egg', food: 'heart', needed: 4, color: '#5bc7ee', monster: 'Bubble Bonk' },
];

export const ENEMY_BLUEPRINTS = [
  { species: 'Chompling', trainer: 'Rival Sam', color: '#ef6f6c', accent: '#fff3a3', baseHp: 28, attack: 6 },
  { species: 'Thornpaw', trainer: 'Rival Aisha', color: '#8ab17d', accent: '#f8e984', baseHp: 32, attack: 7 },
  { species: 'Snuffles', trainer: 'Rival Noor', color: '#f4a261', accent: '#ffe1a0', baseHp: 30, attack: 6 },
  { species: 'Moonmop', trainer: 'Rival Leo', color: '#9d7ee8', accent: '#ffe9fc', baseHp: 34, attack: 7 },
  { species: 'Bubblebop', trainer: 'Rival Maya', color: '#4db6ac', accent: '#e8fff8', baseHp: 31, attack: 6 },
];
