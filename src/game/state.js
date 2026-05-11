import { EGG_BLUEPRINTS, FOOD_TYPES } from './constants.js';

export function createInitialState() {
  return {
    coins: 0,
    score: 0,
    inventory: Object.fromEntries(Object.keys(FOOD_TYPES).map((key) => [key, 0])),
    selectedFood: 'pizza',
    selectedMonsterId: 'buddy',
    monsters: [
      {
        id: 'buddy',
        name: 'Pebble Puff',
        color: '#7fd879',
        accent: '#ffe36d',
        size: 1,
        maxHp: 42,
        hp: 42,
        attack: 8,
        level: 1,
        captured: true,
      },
    ],
    eggs: EGG_BLUEPRINTS.map((egg) => ({ ...egg, progress: 0, hatched: false })),
    battle: null,
    battleWins: 0,
    math: {
      correct: 0,
      streak: 0,
      trophies: [],
    },
  };
}

export function selectedMonster(state) {
  return state.monsters.find((monster) => monster.id === state.selectedMonsterId) ?? state.monsters[0];
}

export function addCollectible(state, type) {
  if (type === 'coin') {
    state.coins += 1;
    state.score += 10;
    return 'Coin';
  }

  if (state.inventory[type] !== undefined) {
    state.inventory[type] += 1;
    state.score += 25;
    return FOOD_TYPES[type].label;
  }

  return '';
}

export function feedMonster(state, foodType) {
  const monster = selectedMonster(state);
  const food = FOOD_TYPES[foodType];

  if (!monster || !food || state.inventory[foodType] <= 0) {
    return null;
  }

  state.inventory[foodType] -= 1;
  monster.size = Math.min(2.4, Number((monster.size + food.growth * 0.035).toFixed(2)));
  monster.maxHp += food.growth;
  monster.hp = Math.min(monster.maxHp, monster.hp + food.growth + 2);
  monster.attack += food.growth > 3 ? 1 : 0;
  return monster;
}

export function feedEgg(state, eggId, foodType) {
  const egg = state.eggs.find((item) => item.id === eggId);
  const food = FOOD_TYPES[foodType];

  if (!egg || egg.hatched || !food || state.inventory[foodType] <= 0) {
    return { changed: false, hatched: false, egg };
  }

  state.inventory[foodType] -= 1;
  egg.progress += foodType === egg.food ? food.eggPower + 1 : food.eggPower;

  if (egg.progress >= egg.needed) {
    egg.hatched = true;
    const monster = {
      id: `${egg.id}-${Date.now()}`,
      name: egg.monster,
      color: egg.color,
      accent: '#fff5a8',
      size: 0.9,
      maxHp: 34 + state.monsters.length * 4,
      hp: 34 + state.monsters.length * 4,
      attack: 7 + state.monsters.length,
      level: 1,
      captured: true,
    };
    state.monsters.push(monster);
    state.selectedMonsterId = monster.id;
    return { changed: true, hatched: true, egg, monster };
  }

  return { changed: true, hatched: false, egg };
}

export function captureMonster(state, enemy) {
  const baseName = enemy.captureName ?? enemy.name.replace('Wild ', '');
  const existingCount = state.monsters.filter((monster) => monster.name.startsWith(baseName)).length;
  const monster = {
    id: `captured-${Date.now()}`,
    name: existingCount > 0 ? `${baseName} ${existingCount + 1}` : baseName,
    color: enemy.color,
    accent: enemy.accent,
    size: 0.95,
    maxHp: enemy.maxHp,
    hp: enemy.maxHp,
    attack: Math.max(6, enemy.attack - 1),
    level: enemy.level ?? 1,
    captured: true,
  };

  state.monsters.push(monster);
  state.selectedMonsterId = monster.id;
  state.battleWins += 1;
  return monster;
}
