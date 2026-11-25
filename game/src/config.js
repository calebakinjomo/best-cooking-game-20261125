// Sizzle & Serve — tuning, recipes, palette and station layout in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** Length of one dinner shift, in seconds. */
export const SHIFT_SECONDS = 180;

export const CHEF = {
  radius: 24,
  speed: 330,
  interactRange: 96,
};

export const HEARTS = 3;

/** Ingredient kinds. `prep` says what the raw item needs before it can be plated. */
export const INGREDIENTS = {
  bun: { name: 'Bun', prep: 'ready', color: '#e8a94f', dark: '#b97a26' },
  patty: { name: 'Patty', prep: 'grill', color: '#8a5a33', dark: '#5e3a1e' },
  lettuce: { name: 'Lettuce', prep: 'chop', color: '#7bc950', dark: '#4d8f2a' },
  tomato: { name: 'Tomato', prep: 'chop', color: '#e5484d', dark: '#a92c30' },
  cheese: { name: 'Cheese', prep: 'ready', color: '#f2c94c', dark: '#c79a1d' },
  fries: { name: 'Fries', prep: 'fry', color: '#f7d774', dark: '#d9a441' },
};

/** Finished (platable) form of each ingredient, with its display name. */
export const FINISHED = {
  bun: 'Bun',
  patty: 'Grilled Patty',
  lettuce: 'Chopped Lettuce',
  tomato: 'Chopped Tomato',
  cheese: 'Cheese',
  fries: 'Crispy Fries',
};

/** An item the chef carries or a station holds: { kind, state }. */
export function rawItem(kind) {
  return { kind, state: 'raw' };
}
export function finishedItem(kind) {
  return { kind, state: 'done' };
}
export function itemName(item) {
  if (!item) return '';
  if (item.state === 'done') return FINISHED[item.kind];
  if (item.state === 'burnt') return `Burnt ${INGREDIENTS[item.kind].name}`;
  if (INGREDIENTS[item.kind].prep === 'ready') return INGREDIENTS[item.kind].name;
  return `Raw ${INGREDIENTS[item.kind].name}`;
}
/** True when the item can go straight onto the plate: finished, or an
 * ingredient that needs no prep (bun, cheese) even while still "raw". */
export function isPlatable(item) {
  if (!item) return false;
  if (item.state === 'done') return true;
  return item.state === 'raw' && INGREDIENTS[item.kind].prep === 'ready';
}

/** The menu: every dish is a set of finished ingredients. */
export const RECIPES = [
  {
    id: 'classic',
    name: 'Classic Burger',
    items: ['bun', 'patty', 'lettuce', 'tomato'],
    base: 120,
    color: '#e8a94f',
  },
  {
    id: 'cheese',
    name: 'Cheese Melt',
    items: ['bun', 'patty', 'cheese'],
    base: 110,
    color: '#f2c94c',
  },
  {
    id: 'salad',
    name: 'Garden Salad',
    items: ['lettuce', 'tomato', 'cheese'],
    base: 100,
    color: '#7bc950',
  },
  {
    id: 'fries',
    name: 'Crispy Fries',
    items: ['fries'],
    base: 60,
    color: '#f7d774',
  },
  {
    id: 'deluxe',
    name: 'Deluxe Burger',
    items: ['bun', 'patty', 'cheese', 'lettuce', 'tomato'],
    base: 160,
    color: '#e5484d',
  },
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

/** Cooking stations, in logical coordinates. */
export const STATIONS = {
  // Pantry bins down the left wall, one per ingredient, in menu order.
  bins: ['bun', 'patty', 'lettuce', 'tomato', 'cheese', 'fries'].map((kind, i) => ({
    kind: 'bin',
    ingredient: kind,
    x: 16,
    y: 118 + i * 92,
    w: 152,
    h: 84,
  })),
  // Work island across the top centre: chopping board, grill (2 slots), fryer (2 slots).
  // Kept clear of the pantry bins so the nearest station to a bin is the bin.
  board: { kind: 'board', x: 300, y: 132, w: 180, h: 158 },
  grill: { kind: 'grill', x: 500, y: 132, w: 240, h: 158, slots: 2 },
  fryer: { kind: 'fryer', x: 760, y: 132, w: 240, h: 158, slots: 2 },
  // Assembly plate and serve window down the right wall.
  plate: { kind: 'plate', x: 1096, y: 132, w: 168, h: 158 },
  serve: { kind: 'serve', x: 1096, y: 322, w: 168, h: 158 },
  trash: { kind: 'trash', x: 1096, y: 512, w: 168, h: 130 },
};

/** Where the chef may walk (the open floor, around the island). */
export const FLOOR = { x: 184, y: 120, w: 896, h: 584 };

/** The work island the chef walks around, never through (board + grill + fryer). */
export const ISLAND = { x: 294, y: 126, w: 712, h: 170 };

/** Prep times, in seconds, and how long a cooked item survives before burning. */
export const PREP = {
  chopSeconds: 1.4,
  grillSeconds: 4.0,
  frySeconds: 3.5,
  burnAfterSeconds: 8.0,
};

/** Order flow: first ticket, then one every `spawnEvery` seconds (shrinking). */
export const ORDERS = {
  firstAtSeconds: 2,
  spawnEveryStart: 12,
  spawnEveryEnd: 7,
  maxActive: 3,
  patienceStart: 55,
  patienceEnd: 38,
};

/** Score: dish base + time bonus, scaled by the combo multiplier. */
export const SCORING = {
  timeBonusMax: 60,
  comboStep: 0.1,
};

export const PALETTE = {
  wall: '#3d2b1f',
  wallTop: '#5a3d28',
  floorA: '#f3e2c2',
  floorB: '#ecd3a8',
  hud: '#2b1d12',
  hudPanel: '#3a2a1a',
  ticket: '#fff8e7',
  ticketEdge: '#d9c08a',
  text: '#2b1d12',
  cream: '#fff6df',
  muted: '#8b93a3',
  danger: '#e5484d',
  good: '#4caf50',
  gold: '#f2c94c',
  accent: '#ff8c42',
  board: '#c98f5a',
  grill: '#4a4a52',
  fryer: '#6b7c93',
  steel: '#9aa5b1',
  plate: '#fdfdfd',
  chef: '#ffffff',
  chefHat: '#f5f5f5',
  apron: '#2f80ed',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sizzle-and-serve.best';
