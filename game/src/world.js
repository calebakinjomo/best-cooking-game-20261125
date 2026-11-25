// Sizzle & Serve — the kitchen simulation: orders, prep stations, the plate,
// serving, scoring and the shift clock. Pure logic: no drawing, no sound here.

import {
  CHEF,
  FINISHED,
  FLOOR,
  HEARTS,
  INGREDIENTS,
  ISLAND,
  ORDERS,
  PREP,
  RECIPES,
  RECIPE_BY_ID,
  SCORING,
  SHIFT_SECONDS,
  STATIONS,
  finishedItem,
  isPlatable,
  itemName,
  rawItem,
} from './config.js';
import { mulberry32, pick } from './random.js';

export const EVENT_SERVED = 1;
export const EVENT_EXPIRED = 2;
export const EVENT_BURNT = 4;
export const EVENT_WRONG = 8;
export const EVENT_OVER = 16;
export const EVENT_CHOP_DONE = 32;
export const EVENT_COOK_DONE = 64;

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function rectDistance(px, py, rect) {
  const dx = Math.max(rect.x - px, 0, px - (rect.x + rect.w));
  const dy = Math.max(rect.y - py, 0, py - (rect.y + rect.h));
  return Math.hypot(dx, dy);
}

function stationRects() {
  const rects = [];
  for (const bin of STATIONS.bins) rects.push({ ...bin, label: INGREDIENTS[bin.ingredient].name });
  rects.push({ ...STATIONS.board, label: 'Chopping Board' });
  rects.push({ ...STATIONS.grill, label: 'Grill' });
  rects.push({ ...STATIONS.fryer, label: 'Fryer' });
  rects.push({ ...STATIONS.plate, label: 'Assembly Plate' });
  rects.push({ ...STATIONS.serve, label: 'Serve Window' });
  rects.push({ ...STATIONS.trash, label: 'Trash' });
  return rects;
}

export function stationAt(point) {
  for (const rect of stationRects()) {
    if (point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h) {
      return rect;
    }
  }
  return null;
}

function stationApproach(rect) {
  // The spot the chef walks to when clicking a station: just outside its edge,
  // clamped inside the walkable floor so the chef can actually arrive.
  if (rect.kind === 'bin') return { x: FLOOR.x + CHEF.radius, y: rect.y + rect.h / 2 };
  if (rect.kind === 'plate' || rect.kind === 'serve' || rect.kind === 'trash') {
    return { x: FLOOR.x + FLOOR.w - CHEF.radius, y: rect.y + rect.h / 2 };
  }
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h + CHEF.radius + 6 };
}

function newOrder(world, recipeId) {
  const recipe = RECIPE_BY_ID[recipeId];
  const progress = Math.min(1, world.time / SHIFT_SECONDS);
  const patience = ORDERS.patienceStart + (ORDERS.patienceEnd - ORDERS.patienceStart) * progress;
  world.orderSeq += 1;
  return { id: world.orderSeq, recipeId, name: recipe.name, patience, maxPatience: patience };
}

function spawnOrder(world) {
  if (world.orders.length >= ORDERS.maxActive) return;
  let recipe = pick(world.rng, RECIPES);
  const active = new Set(world.orders.map((o) => o.recipeId));
  if (active.size < RECIPES.length) {
    let guard = 0;
    while (active.has(recipe.id) && guard < 8) {
      recipe = pick(world.rng, RECIPES);
      guard += 1;
    }
  }
  world.orders.push(newOrder(world, recipe.id));
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

export function matchingOrder(world) {
  if (world.plate.length === 0) return null;
  let best = null;
  for (const order of world.orders) {
    const recipe = RECIPE_BY_ID[order.recipeId];
    if (sameSet(world.plate, recipe.items) && (!best || order.patience < best.patience)) best = order;
  }
  return best;
}

export function createWorld(seed = 1) {
  const world = {
    seed,
    rng: mulberry32(seed),
    screen: SCREEN_TITLE,
    time: 0,
    timeLeft: SHIFT_SECONDS,
    score: 0,
    best: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    missed: 0,
    hearts: HEARTS,
    chef: { x: 640, y: 520, carrying: null, facing: 1, moving: false },
    walkTarget: null,
    pendingInteract: false,
    orders: [],
    orderSeq: 0,
    spawnIn: ORDERS.firstAtSeconds,
    board: { item: null, progress: 0 },
    grill: [
      { item: null, progress: 0, burntIn: 0 },
      { item: null, progress: 0, burntIn: 0 },
    ],
    fryer: [
      { item: null, progress: 0, burntIn: 0 },
      { item: null, progress: 0, burntIn: 0 },
    ],
    plate: [],
    plateReady: false,
    floaters: [],
    particles: [],
    shake: 0,
    message: '',
    messageTtl: 0,
    lastEvent: 0,
    overReason: '',
    startedAt: 0,
  };
  return world;
}

export function resetWorld(world) {
  const seed = world.seed;
  const best = world.best;
  Object.assign(world, createWorld(seed));
  world.best = best;
}

export function startShift(world) {
  resetWorld(world);
  world.screen = SCREEN_PLAY;
  world.startedAt = world.time;
}

function floater(world, x, y, text, color) {
  world.floaters.push({ x, y, text, color, ttl: 1.4, max: 1.4 });
}

function say(world, text, ttl = 1.6) {
  world.message = text;
  world.messageTtl = ttl;
}

function spark(world, x, y, color, count = 8) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.rng() * Math.PI * 2;
    const speed = 30 + world.rng() * 70;
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      life: 0.5 + world.rng() * 0.4,
      max: 0.9,
      color,
      size: 3 + world.rng() * 4,
    });
  }
}

function steam(world, x, y) {
  world.particles.push({
    x: x + (world.rng() - 0.5) * 40,
    y,
    vx: (world.rng() - 0.5) * 12,
    vy: -34 - world.rng() * 20,
    life: 0.9,
    max: 0.9,
    color: 'rgba(255,255,255,0.55)',
    size: 6 + world.rng() * 5,
  });
}

function nearestStation(world) {
  const chef = world.chef;
  let best = null;
  let bestDistance = Infinity;
  for (const rect of stationRects()) {
    const d = rectDistance(chef.x, chef.y, rect);
    if (d < bestDistance) {
      bestDistance = d;
      best = rect;
    }
  }
  return bestDistance <= CHEF.interactRange ? best : null;
}

/** The chef tries to use the nearest station. Returns an event mask. */
function interact(world) {
  const chef = world.chef;
  const station = nearestStation(world);
  if (!station) return 0;
  const hands = chef.carrying;

  if (station.kind === 'bin') {
    if (hands) {
      say(world, 'Hands full!');
      return EVENT_WRONG;
    }
    chef.carrying = rawItem(station.ingredient);
    spark(world, chef.x, chef.y - 20, INGREDIENTS[station.ingredient].color, 5);
    return 0;
  }

  if (station.kind === 'board') {
    const board = world.board;
    if (board.item && board.progress >= 1) {
      if (hands) {
        say(world, 'Hands full!');
        return EVENT_WRONG;
      }
      chef.carrying = board.item;
      board.item = null;
      board.progress = 0;
      return 0;
    }
    if (!board.item && hands && hands.state === 'raw' && INGREDIENTS[hands.kind].prep === 'chop') {
      board.item = hands;
      board.progress = 0;
      chef.carrying = null;
      return 0;
    }
    say(world, board.item ? 'Still chopping…' : 'Lettuce or tomato goes here');
    return EVENT_WRONG;
  }

  if (station.kind === 'grill' || station.kind === 'fryer') {
    const slots = station.kind === 'grill' ? world.grill : world.fryer;
    const want = station.kind === 'grill' ? 'patty' : 'fries';
    const cookSeconds = station.kind === 'grill' ? PREP.grillSeconds : PREP.frySeconds;
    for (const slot of slots) {
      if (slot.item && slot.progress >= 1) {
        if (hands) continue;
        chef.carrying = slot.item;
        slot.item = null;
        slot.progress = 0;
        slot.burntIn = 0;
        return 0;
      }
    }
    if (hands && hands.state === 'raw' && hands.kind === want) {
      const free = slots.find((s) => !s.item);
      if (!free) {
        say(world, 'Both slots are busy!');
        return EVENT_WRONG;
      }
      free.item = hands;
      free.progress = 0;
      free.burntIn = 0;
      chef.carrying = null;
      return 0;
    }
    say(world, station.kind === 'grill' ? 'Raw patties go on the grill' : 'Raw fries go in the fryer');
    return EVENT_WRONG;
  }

  if (station.kind === 'plate') {
    if (!hands) {
      say(world, 'Bring an ingredient to the plate');
      return EVENT_WRONG;
    }
    if (!isPlatable(hands)) {
      say(world, `${itemName(hands)} is not ready yet`);
      return EVENT_WRONG;
    }
    if (world.plate.includes(hands.kind)) {
      say(world, 'That is already on the plate');
      return EVENT_WRONG;
    }
    const wanted = world.orders.some((o) => RECIPE_BY_ID[o.recipeId].items.includes(hands.kind));
    if (!wanted) {
      say(world, 'No order needs that right now');
      return EVENT_WRONG;
    }
    world.plate.push(hands.kind);
    chef.carrying = null;
    spark(world, 1180, 210, '#f2c94c', 8);
    world.plateReady = !!matchingOrder(world);
    return 0;
  }

  if (station.kind === 'serve') {
    const order = matchingOrder(world);
    if (!order) {
      say(world, world.plate.length === 0 ? 'The plate is empty' : 'The plate does not match an order yet');
      return EVENT_WRONG;
    }
    const recipe = RECIPE_BY_ID[order.recipeId];
    world.combo += 1;
    world.bestCombo = Math.max(world.bestCombo, world.combo);
    const timeBonus = Math.round(SCORING.timeBonusMax * (order.patience / order.maxPatience));
    const multiplier = 1 + SCORING.comboStep * (world.combo - 1);
    const points = Math.round((recipe.base + timeBonus) * multiplier);
    world.score += points;
    world.served += 1;
    world.orders = world.orders.filter((o) => o.id !== order.id);
    world.plate = [];
    world.plateReady = false;
    const cx = STATIONS.serve.x + STATIONS.serve.w / 2;
    floater(world, cx, STATIONS.serve.y - 10, `+${points}`, '#2e7d32');
    if (world.combo > 1) floater(world, cx, STATIONS.serve.y - 38, `COMBO x${world.combo}!`, '#ff8c42');
    spark(world, cx, STATIONS.serve.y + 40, '#f2c94c', 16);
    return EVENT_SERVED;
  }

  if (station.kind === 'trash') {
    if (hands) {
      chef.carrying = null;
      say(world, 'Tossed it');
      return 0;
    }
    if (world.plate.length > 0) {
      world.plate = [];
      world.plateReady = false;
      say(world, 'Plate cleared');
      return 0;
    }
    say(world, 'Nothing to throw away');
    return EVENT_WRONG;
  }

  return 0;
}

function clearPlate(world) {
  const station = nearestStation(world);
  if (station && station.kind === 'plate' && world.plate.length > 0) {
    world.plate = [];
    world.plateReady = false;
    say(world, 'Plate cleared');
  }
}

function stepCooking(world, dt) {
  let events = 0;
  const board = world.board;
  if (board.item && board.progress < 1) {
    board.progress = Math.min(1, board.progress + dt / PREP.chopSeconds);
    if (board.progress >= 1) {
      board.item = finishedItem(board.item.kind);
      events |= EVENT_CHOP_DONE;
    }
  }
  for (const slots of [world.grill, world.fryer]) {
    const cookSeconds = slots === world.grill ? PREP.grillSeconds : PREP.frySeconds;
    for (const slot of slots) {
      if (!slot.item) continue;
      if (slot.progress < 1) {
        slot.progress = Math.min(1, slot.progress + dt / cookSeconds);
        if (slot.progress >= 1) {
          slot.item = finishedItem(slot.item.kind);
          slot.burntIn = 0;
          events |= EVENT_COOK_DONE;
        }
      } else if (slot.item.state === 'done') {
        slot.burntIn += dt;
        if (slot.burntIn >= PREP.burnAfterSeconds) {
          slot.item = { kind: slot.item.kind, state: 'burnt' };
          slot.burntIn = 0;
          events |= EVENT_BURNT;
          say(world, 'Something burnt!');
        }
      }
    }
  }
  return events;
}

function stepOrders(world, dt) {
  let events = 0;
  world.spawnIn -= dt;
  if (world.spawnIn <= 0) {
    spawnOrder(world);
    const progress = Math.min(1, world.time / SHIFT_SECONDS);
    world.spawnIn = ORDERS.spawnEveryStart + (ORDERS.spawnEveryEnd - ORDERS.spawnEveryStart) * progress;
  }
  for (const order of world.orders) order.patience -= dt;
  const expired = world.orders.filter((o) => o.patience <= 0);
  if (expired.length > 0) {
    world.orders = world.orders.filter((o) => o.patience > 0);
    world.missed += expired.length;
    world.hearts -= expired.length;
    world.combo = 0;
    events |= EVENT_EXPIRED;
    say(world, expired.length > 1 ? `${expired.length} orders walked out!` : 'An order walked out!');
    world.shake = 0.4;
    if (world.hearts <= 0) {
      world.hearts = 0;
      world.overReason = 'closed';
      events |= EVENT_OVER;
    }
  }
  return events;
}

function moveChef(world, dt, dir) {
  const chef = world.chef;
  let mx = dir.x;
  let my = dir.y;
  if (mx === 0 && my === 0 && world.walkTarget) {
    const dx = world.walkTarget.x - chef.x;
    const dy = world.walkTarget.y - chef.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 10) {
      world.walkTarget = null;
      if (world.pendingInteract) {
        world.pendingInteract = false;
        return interact(world);
      }
      return 0;
    }
    mx = dx / dist;
    my = dy / dist;
  }
  if (mx !== 0 || my !== 0) {
    chef.moving = true;
    if (mx !== 0) chef.facing = mx > 0 ? 1 : -1;
    chef.x += mx * CHEF.speed * dt;
    chef.y += my * CHEF.speed * dt;
  } else {
    chef.moving = false;
  }
  chef.x = Math.min(FLOOR.x + FLOOR.w - CHEF.radius, Math.max(FLOOR.x + CHEF.radius, chef.x));
  chef.y = Math.min(FLOOR.y + FLOOR.h - CHEF.radius, Math.max(FLOOR.y + CHEF.radius, chef.y));
  // The chef walks around the work island, never through it: push the circle
  // out along the axis of least penetration.
  const left = chef.x - CHEF.radius;
  const right = chef.x + CHEF.radius;
  const top = chef.y - CHEF.radius;
  const bottom = chef.y + CHEF.radius;
  if (right > ISLAND.x && left < ISLAND.x + ISLAND.w && bottom > ISLAND.y && top < ISLAND.y + ISLAND.h) {
    const pushLeft = right - ISLAND.x;
    const pushRight = ISLAND.x + ISLAND.w - left;
    const pushUp = bottom - ISLAND.y;
    const pushDown = ISLAND.y + ISLAND.h - top;
    const min = Math.min(pushLeft, pushRight, pushUp, pushDown);
    if (min === pushLeft) chef.x = ISLAND.x - CHEF.radius;
    else if (min === pushRight) chef.x = ISLAND.x + ISLAND.w + CHEF.radius;
    else if (min === pushUp) chef.y = ISLAND.y - CHEF.radius;
    else chef.y = ISLAND.y + ISLAND.h + CHEF.radius;
  }
  return 0;
}

/**
 * Advance the world one fixed step. `controls` carries the frame's input:
 * { dir: {x, y}, interact: bool, clear: bool, click: {x, y} | null }.
 * Returns an event mask for sounds and the main loop.
 */
export function stepWorld(world, dt, controls) {
  let events = 0;
  if (world.screen !== SCREEN_PLAY) return 0;

  world.time += dt;
  world.timeLeft = Math.max(0, SHIFT_SECONDS - world.time);
  if (world.messageTtl > 0) world.messageTtl -= dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt);

  if (controls.click) {
    const station = stationAt(controls.click);
    if (station) {
      world.walkTarget = stationApproach(station);
      world.pendingInteract = true;
    } else if (
      controls.click.x >= FLOOR.x && controls.click.x <= FLOOR.x + FLOOR.w &&
      controls.click.y >= FLOOR.y && controls.click.y <= FLOOR.y + FLOOR.h &&
      // The island is walked around, never onto: ignore clicks on it.
      !(controls.click.x >= ISLAND.x && controls.click.x <= ISLAND.x + ISLAND.w &&
        controls.click.y >= ISLAND.y && controls.click.y <= ISLAND.y + ISLAND.h)
    ) {
      world.walkTarget = { x: controls.click.x, y: controls.click.y };
      world.pendingInteract = false;
    }
  }
  if (controls.interact) {
    world.walkTarget = null;
    world.pendingInteract = false;
    events |= interact(world);
  }
  if (controls.clear) clearPlate(world);

  events |= moveChef(world, dt, controls.dir || { x: 0, y: 0 });
  events |= stepCooking(world, dt);
  events |= stepOrders(world, dt);

  // Steam and sizzle ambience over anything cooking.
  for (const slot of [...world.grill, ...world.fryer]) {
    if (slot.item && slot.progress > 0 && slot.progress < 1 && world.rng() < dt * 6) {
      const rect = slot === world.grill[0] || slot === world.grill[1] ? STATIONS.grill : STATIONS.fryer;
      const index = slotsIndex(world, slot);
      steam(world, rect.x + 66 + index * 132, rect.y + 60);
    }
  }
  if (world.board.item && world.board.progress < 1 && world.rng() < dt * 4) {
    steam(world, STATIONS.board.x + 108, STATIONS.board.y + 70);
  }

  for (const floater of world.floaters) {
    floater.ttl -= dt;
    floater.y -= 34 * dt;
  }
  world.floaters = world.floaters.filter((f) => f.ttl > 0);
  for (const p of world.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 60 * dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);

  if (world.time >= SHIFT_SECONDS && !(events & EVENT_OVER)) {
    world.overReason = 'done';
    events |= EVENT_OVER;
  }
  if (events & EVENT_OVER) {
    world.screen = SCREEN_OVER;
    if (world.score > world.best) world.best = world.score;
  }
  world.lastEvent = events;
  return events;
}

function slotsIndex(world, slot) {
  const grillIndex = world.grill.indexOf(slot);
  if (grillIndex >= 0) return grillIndex;
  return world.fryer.indexOf(slot);
}
