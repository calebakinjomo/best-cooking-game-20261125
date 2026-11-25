// Sizzle & Serve — boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast one),
// and the renderer paints what is there. The game moves between four screens:
// title, play, paused and over.
//
// ?shot=kitchen|assembly|serve|rush (with &seed=N) stages that scene instead of
// running the loop, paints it twice and sets window.__shotReady for a screenshot.
// ?test=flow runs a scripted play-test in the page and reports the result on
// window.__testResult (used by headless checks, not by players).
import { BEST_KEY, STEP } from './config.js';
import { createAudio } from './audio.js';
import {
  ACTION_CLEAR,
  ACTION_CONFIRM,
  ACTION_INTERACT,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RESTART,
  createInput,
} from './input.js';
import {
  EVENT_BURNT,
  EVENT_CHOP_DONE,
  EVENT_COOK_DONE,
  EVENT_EXPIRED,
  EVENT_OVER,
  EVENT_SERVED,
  EVENT_WRONG,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  createWorld,
  resetWorld,
  startShift,
  stepWorld,
} from './world.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const test = params.get('test');
const seed = Number.parseInt(params.get('seed') || '1', 10) || 1;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const renderer = createRenderer(canvas);
const audio = createAudio();
const input = createInput(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

world.best = readBest();

function announce() {
  if (!status) return;
  if (world.screen === SCREEN_TITLE) status.textContent = 'Sizzle and Serve. Press Enter to start your shift.';
  else if (world.screen === SCREEN_PLAY) status.textContent = `Score ${world.score}. ${world.orders.length} orders waiting. ${Math.ceil(world.timeLeft)} seconds left in the shift.`;
  else if (world.screen === SCREEN_PAUSED) status.textContent = 'Paused.';
  else status.textContent = `Shift over. Final score ${world.score}. Press R to play again.`;
}

function playEvents(events) {
  if (events & EVENT_SERVED) audio.serve();
  if (events & EVENT_EXPIRED) audio.expire();
  if (events & EVENT_WRONG) audio.error();
  if (events & EVENT_CHOP_DONE) audio.chop();
  if (events & EVENT_COOK_DONE) audio.sizzle();
  if (events & EVENT_BURNT) audio.error();
  if (events & EVENT_OVER) {
    saveBest(world.best);
    audio.ding();
  }
}

function runShot(name) {
  const screen = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

/**
 * Scripted play-test: drives the real world with synthetic controls and checks
 * the loop's beats — pick up, chop, grill, fry, assemble, serve, expire.
 * Reports on window.__testResult as { ok, checks, log }.
 */
function runTest(kind) {
  const log = [];
  const checks = {};
  function check(name, ok) {
    checks[name] = !!ok;
    log.push(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  }
  const w = createWorld(7);
  startShift(w);
  const none = { dir: { x: 0, y: 0 }, interact: false, clear: false, click: null };
  const step = (n, controls = none) => {
    for (let i = 0; i < n; i += 1) stepWorld(w, STEP, controls);
  };
  // An order appears within the first seconds; pin it to a Classic Burger so
  // the scripted plate below always has a ticket to match.
  step(180);
  check('order spawns', w.orders.length > 0);
  w.orders = [{ id: 1, recipeId: 'classic', name: 'Classic Burger', patience: 55, maxPatience: 55 }];
  log.push('first order: classic');
  // Walk to the bun bin and pick a bun up.
  w.chef.x = 220;
  w.chef.y = 160;
  step(1, { ...none, interact: true });
  check('pick up bun', w.chef.carrying && w.chef.carrying.kind === 'bun');
  // Carry it to the plate and add it.
  w.chef.x = 1050;
  w.chef.y = 210;
  step(1, { ...none, interact: true });
  check('bun lands on plate', w.plate.includes('bun'));
  // Chop a lettuce: bin -> board -> wait -> pick up -> plate.
  w.chef.x = 220;
  w.chef.y = 336;
  step(1, { ...none, interact: true });
  check('pick up lettuce', w.chef.carrying && w.chef.carrying.kind === 'lettuce');
  w.chef.x = 344;
  w.chef.y = 340;
  step(1, { ...none, interact: true });
  check('lettuce on board', !!w.board.item);
  step(120);
  check('lettuce chopped', w.board.item && w.board.item.state === 'done');
  step(1, { ...none, interact: true });
  check('pick up chopped lettuce', w.chef.carrying && w.chef.carrying.state === 'done');
  w.chef.x = 1050;
  w.chef.y = 210;
  step(1, { ...none, interact: true });
  check('lettuce lands on plate', w.plate.includes('lettuce'));
  // Grill a patty: bin -> grill -> wait -> pick up -> plate.
  w.chef.x = 220;
  w.chef.y = 244;
  step(1, { ...none, interact: true });
  check('pick up patty', w.chef.carrying && w.chef.carrying.kind === 'patty');
  w.chef.x = 617;
  w.chef.y = 340;
  step(1, { ...none, interact: true });
  check('patty on grill', !!w.grill[0].item);
  step(300);
  check('patty grilled', w.grill[0].item && w.grill[0].item.state === 'done');
  step(1, { ...none, interact: true });
  check('pick up grilled patty', w.chef.carrying && w.chef.carrying.state === 'done');
  w.chef.x = 1050;
  w.chef.y = 210;
  step(1, { ...none, interact: true });
  check('patty lands on plate', w.plate.includes('patty'));
  // Fry fries the same way, then check the whole flow serves when the plate
  // matches an order: force the first order to be the dish we just built.
  w.chef.x = 220;
  w.chef.y = 660;
  step(1, { ...none, interact: true });
  check('pick up fries', w.chef.carrying && w.chef.carrying.kind === 'fries');
  w.chef.x = 912;
  w.chef.y = 340;
  step(1, { ...none, interact: true });
  check('fries in fryer', !!w.fryer[0].item);
  step(260);
  check('fries fried', w.fryer[0].item && w.fryer[0].item.state === 'done');
  // Serve: build a matching order for the plate we have (bun+lettuce+patty is
  // not a menu dish, so add a tomato and force a Classic Burger ticket).
  w.chef.x = 220;
  w.chef.y = 428;
  step(1, { ...none, interact: true });
  w.chef.x = 344;
  w.chef.y = 340;
  step(1, { ...none, interact: true });
  step(120);
  step(1, { ...none, interact: true });
  w.chef.x = 1050;
  w.chef.y = 210;
  step(1, { ...none, interact: true });
  check('tomato lands on plate', w.plate.includes('tomato'));
  const scoreBefore = w.score;
  w.chef.x = 1050;
  w.chef.y = 400;
  step(1, { ...none, interact: true });
  check('classic burger served', w.score > scoreBefore && w.served === 1);
  check('plate cleared after serve', w.plate.length === 0);
  // Orders left alone expire and cost a heart.
  const heartsBefore = w.hearts;
  for (const order of w.orders) order.patience = 0.05;
  step(10);
  check('order expires', w.hearts < heartsBefore);
  const ok = Object.values(checks).every(Boolean);
  window.__testResult = { ok, checks, log, score: w.score, served: w.served };
  // Also mirror it into the document title so headless `--dump-dom` can read it.
  document.title = `TEST ${ok ? 'PASS' : 'FAIL'} ${JSON.stringify(window.__testResult)}`;
}

if (shot) {
  runShot(shot);
} else if (test) {
  runTest(test);
} else {
  let last = performance.now();
  let accumulator = 0;
  let announced = '';

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    accumulator += elapsed;

    if (input.takeAction(ACTION_MUTE)) {
      const muted = audio.toggleMute();
      world.message = muted ? 'Sound off' : 'Sound on';
      world.messageTtl = 1;
    }
    if (input.takeAction(ACTION_RESTART) && (world.screen === SCREEN_OVER || world.screen === SCREEN_PAUSED)) {
      startShift(world);
      world.best = readBest();
    }
    if (input.takeAction(ACTION_PAUSE)) {
      if (world.screen === SCREEN_PLAY) world.screen = SCREEN_PAUSED;
      else if (world.screen === SCREEN_PAUSED) world.screen = SCREEN_PLAY;
    }
    const clicked = input.takeClick();
    if (clicked) {
      audio.unlock();
      if (world.screen === SCREEN_TITLE) startShift(world);
      else if (world.screen === SCREEN_OVER) {
        startShift(world);
        world.best = readBest();
      } else if (world.screen === SCREEN_PAUSED) world.screen = SCREEN_PLAY;
    }
    if (input.takeAction(ACTION_CONFIRM) && world.screen === SCREEN_TITLE) startShift(world);

    const controls = {
      dir: input.dir(),
      interact: input.takeAction(ACTION_INTERACT),
      clear: input.takeAction(ACTION_CLEAR),
      click: clicked && world.screen === SCREEN_PLAY ? clicked : null,
    };
    if (controls.interact || controls.click) audio.unlock();

    let guard = 0;
    while (accumulator >= STEP && guard < 8) {
      const events = stepWorld(world, STEP, controls);
      playEvents(events);
      controls.interact = false;
      controls.clear = false;
      controls.click = null;
      accumulator -= STEP;
      guard += 1;
    }
    if (guard >= 8) accumulator = 0;

    renderer.draw(world, world.screen);
    const summary = `${world.screen}|${world.score}|${world.orders.length}|${Math.ceil(world.timeLeft)}`;
    if (summary !== announced) {
      announced = summary;
      announce();
    }
  }
  requestAnimationFrame(frame);
}
