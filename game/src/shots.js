// The screenshot scenes behind ?shot=kitchen|assembly|serve|rush. Each one
// builds a real world state directly — a live shift, frozen mid-play — so the
// frame is what the game genuinely looks like, and the same seed always gives
// the same frame. Every scene shows the kitchen, the order board, ingredients
// on the counter and the shift timer; assembly shows a dish mid-build and
// serve shows a plate ready to ring the bell.

import { FINISHED, INGREDIENTS, PREP, RECIPES, SHIFT_SECONDS, STATIONS } from './config.js';
import { SCREEN_PLAY, createWorld, matchingOrder, startShift } from './world.js';

function setTime(world, seconds) {
  world.time = seconds;
  world.timeLeft = Math.max(0, SHIFT_SECONDS - seconds);
}

function addOrder(world, recipeId, patience) {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  world.orderSeq += 1;
  world.orders.push({
    id: world.orderSeq,
    recipeId,
    name: recipe.name,
    patience,
    maxPatience: 55,
  });
}

function putOnGrill(world, slot, kind, progress, burntIn = 0) {
  world.grill[slot] = {
    item: { kind, state: progress >= 1 ? 'done' : 'raw' },
    progress,
    burntIn,
  };
}

function putInFryer(world, slot, kind, progress) {
  world.fryer[slot] = { item: { kind, state: progress >= 1 ? 'done' : 'raw' }, progress, burntIn: 0 };
}

function baseKitchen(world) {
  startShift(world);
  world.screen = SCREEN_PLAY;
  setTime(world, 33);
  world.score = 320;
  world.combo = 3;
  world.bestCombo = 3;
  world.served = 3;
  world.chef.x = 640;
  world.chef.y = 520;
}

/** 1-kitchen: the rush is on — three tickets, grill and fryer busy, chef mid-floor. */
function stageKitchen(world) {
  baseKitchen(world);
  addOrder(world, 'classic', 41);
  addOrder(world, 'cheese', 27);
  addOrder(world, 'deluxe', 52);
  putOnGrill(world, 0, 'patty', 0.62);
  putOnGrill(world, 1, 'patty', 0.95);
  putInFryer(world, 0, 'fries', 0.45);
  world.chef.carrying = { kind: 'lettuce', state: 'raw' };
  world.chef.x = 560;
  world.chef.y = 470;
  world.chef.facing = -1;
}

/** 2-assembly: a Classic Burger half-built on the plate, chef bringing tomato. */
function stageAssembly(world) {
  baseKitchen(world);
  setTime(world, 74);
  world.score = 540;
  world.combo = 4;
  addOrder(world, 'classic', 33);
  addOrder(world, 'salad', 48);
  addOrder(world, 'fries', 19);
  world.plate = ['bun', 'patty', 'lettuce'];
  world.plateReady = !!matchingOrder(world);
  world.board.item = { kind: 'tomato', state: 'raw' };
  world.board.progress = 0.55;
  putOnGrill(world, 0, 'patty', 0.3);
  world.chef.carrying = { kind: 'tomato', state: 'done' };
  world.chef.x = 980;
  world.chef.y = 420;
  world.chef.facing = 1;
}

/** 3-serve: the Deluxe Burger is complete — the bell glows, serve now. */
function stageServe(world) {
  baseKitchen(world);
  setTime(world, 118);
  world.score = 890;
  world.combo = 5;
  world.bestCombo = 5;
  world.served = 6;
  addOrder(world, 'deluxe', 24);
  addOrder(world, 'cheese', 44);
  world.plate = ['bun', 'patty', 'cheese', 'lettuce', 'tomato'];
  world.plateReady = !!matchingOrder(world);
  putInFryer(world, 1, 'fries', 0.8);
  world.chef.x = 1010;
  world.chef.y = 400;
  world.chef.facing = 1;
}

/** 4-rush: late shift — low patience, chopping in progress, everything cooking. */
function stageRush(world) {
  baseKitchen(world);
  setTime(world, 152);
  world.score = 1240;
  world.combo = 6;
  world.bestCombo = 6;
  world.served = 9;
  world.hearts = 2;
  addOrder(world, 'classic', 12);
  addOrder(world, 'salad', 9);
  addOrder(world, 'deluxe', 31);
  world.board.item = { kind: 'lettuce', state: 'raw' };
  world.board.progress = 0.7;
  putOnGrill(world, 0, 'patty', 0.85);
  putOnGrill(world, 1, 'patty', 0.2);
  putInFryer(world, 0, 'fries', 0.95);
  putInFryer(world, 1, 'fries', 0.4);
  world.plate = ['bun', 'patty'];
  world.plateReady = !!matchingOrder(world);
  world.chef.carrying = { kind: 'cheese', state: 'done' };
  world.chef.x = 700;
  world.chef.y = 480;
  world.chef.facing = 1;
  world.message = 'Two orders are about to walk out!';
  world.messageTtl = 99;
}

const STAGES = {
  kitchen: stageKitchen,
  assembly: stageAssembly,
  serve: stageServe,
  rush: stageRush,
};

/**
 * Set `world` to the named scene (kitchen, assembly, serve or rush; any other
 * name is kitchen) and return the screen to draw over it.
 */
export function stageShot(name, world) {
  const stage = STAGES[name] || STAGES.kitchen;
  stage(world);
  return SCREEN_PLAY;
}
