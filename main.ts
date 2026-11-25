// Sizzle & Serve — a make.fun best-cooking-game entry (Node 22, standard library
// only): run The Golden Skillet diner in a 3-minute dinner rush (180 seconds).
// Orders roll in on the board: grab buns, patties, lettuce, tomatoes, cheese and
// fries from the pantry, chop the veg, grill the patties, fry the fries, build
// each dish on the assembly plate and ring the serve bell before the customer
// walks out. Serve fast for a time bonus and chain serves for a combo — but let
// an order expire and you lose a heart; three strikes and the kitchen closes
// early. Keyboard + mouse: WASD / arrows move the chef, E or click uses a
// station, Q clears the plate, P pauses, M mutes, R restarts.
//
// The menu (game/src/config.js) has 5 recipes, each a set of finished
// ingredients with its own base score: Classic Burger (bun, grilled patty,
// chopped lettuce, chopped tomato; 120), Cheese Melt (bun, patty, cheese; 110),
// Garden Salad (lettuce, tomato, cheese; 100), Crispy Fries (fries; 60) and
// Deluxe Burger (bun, patty, cheese, lettuce, tomato; 160). Order flow ramps
// up as the shift goes on: tickets arrive faster (every 12s down to 7s) and
// patience shrinks (55s down to 38s), with at most 3 active orders.
//
// How the judge ranks it (most important first): (1) a complete cooking game
// shown in its own screenshots — kitchen and order board, ingredients on the
// counter, a dish mid-assembly, a timer and a plate ready to serve; (2) fun
// and depth — orders that push route-planning through the kitchen, recipes
// that combine in different ways, pressure that grows without adding chores;
// (3) feel and polish — chopping and plating that answer at once, a timer you
// can feel, a service rush that reads in a glance; (4) look and originality —
// food drawn so it looks worth serving, counters readable at a glance, a
// kitchen with a look of its own, all original art, sounds and names; (5)
// structure — the game's own source split into files with one clear job each,
// named for what they do (game/src/: config, world, render, main, input,
// audio, random, shots).
//
// The game itself is this directory's game/ folder, plain static files a
// desktop browser loads offline (game/index.html and its ES modules, no
// library and no network request), and the program hands it in. It copies
// game/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
