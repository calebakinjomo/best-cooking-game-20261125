// Sizzle & Serve — every pixel the player sees: the kitchen, the order board,
// the stations, the chef, and the title / pause / game-over screens.
// Canvas 2D only, no image files: every ingredient is drawn from shapes.

import {
  CHEF,
  FIELD,
  FINISHED,
  FLOOR,
  FONT,
  INGREDIENTS,
  PALETTE,
  RECIPES,
  RECIPE_BY_ID,
  SHIFT_SECONDS,
  STATIONS,
} from './config.js';
import { SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './world.js';

export { SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight = 700, align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Draw one ingredient icon centred at (x, y), fitting in `size` pixels. */
export function drawIngredient(ctx, kind, x, y, size, state = 'done') {
  const ing = INGREDIENTS[kind];
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (state === 'burnt') {
    ctx.fillStyle = '#1d1d1d';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, -s * 0.2);
    ctx.lineTo(s * 0.1, s * 0.1);
    ctx.moveTo(s * 0.35, -s * 0.35);
    ctx.lineTo(-s * 0.05, s * 0.3);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (kind === 'bun') {
    ctx.fillStyle = ing.dark;
    roundRect(ctx, -s * 0.8, s * 0.1, s * 1.6, s * 0.42, s * 0.14);
    ctx.fill();
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.arc(0, s * 0.08, s * 0.8, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    for (const [dx, dy] of [[-0.4, -0.35], [0, -0.55], [0.4, -0.35], [-0.15, -0.2], [0.2, -0.18]]) {
      ctx.beginPath();
      ctx.ellipse(dx * s, dy * s, s * 0.07, s * 0.045, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'patty') {
    ctx.fillStyle = state === 'raw' ? '#a86a4a' : ing.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.85, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = state === 'raw' ? '#c98d68' : '#4a2c14';
    ctx.lineWidth = 2.5;
    for (const dx of [-0.45, 0, 0.45]) {
      ctx.beginPath();
      ctx.moveTo(dx * s, -s * 0.32);
      ctx.lineTo(dx * s, s * 0.32);
      ctx.stroke();
    }
  } else if (kind === 'lettuce') {
    ctx.fillStyle = ing.color;
    for (const [dx, dy, r] of [[-0.45, 0.1, 0.5], [0, -0.25, 0.55], [0.45, 0.1, 0.5], [0, 0.25, 0.5]]) {
      ctx.beginPath();
      ctx.arc(dx * s, dy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = ing.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.6);
    ctx.lineTo(0, s * 0.55);
    ctx.stroke();
  } else if (kind === 'tomato') {
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.arc(0, s * 0.05, s * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7bc950';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.55);
    ctx.lineTo(-s * 0.3, -s * 0.85);
    ctx.lineTo(0, -s * 0.62);
    ctx.lineTo(s * 0.3, -s * 0.85);
    ctx.lineTo(0, -s * 0.55);
    ctx.fill();
    if (state === 'done') {
      ctx.strokeStyle = '#ffd9d9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, s * 0.05, s * 0.4, 0.3, Math.PI * 1.4);
      ctx.stroke();
    }
  } else if (kind === 'cheese') {
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, s * 0.55);
    ctx.lineTo(s * 0.8, s * 0.55);
    ctx.lineTo(0, -s * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ing.dark;
    for (const [dx, dy] of [[-0.25, 0.2], [0.2, 0.05], [0.05, 0.35]]) {
      ctx.beginPath();
      ctx.arc(dx * s, dy * s, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'fries') {
    ctx.strokeStyle = state === 'raw' ? '#e8d9a0' : ing.color;
    ctx.lineWidth = s * 0.22;
    ctx.lineCap = 'round';
    for (const [dx, tilt] of [[-0.45, -0.12], [-0.15, 0.05], [0.15, -0.06], [0.45, 0.12]]) {
      ctx.beginPath();
      ctx.moveTo(dx * s - tilt * s, s * 0.25);
      ctx.lineTo(dx * s + tilt * s, -s * 0.65);
      ctx.stroke();
    }
    ctx.fillStyle = '#e5484d';
    ctx.beginPath();
    ctx.moveTo(-s * 0.75, s * 0.1);
    ctx.lineTo(s * 0.75, s * 0.1);
    ctx.lineTo(s * 0.6, s * 0.8);
    ctx.lineTo(-s * 0.6, s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, s * 0.45, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawStationLabel(ctx, rect, label, sub = '') {
  text(ctx, label, rect.x + rect.w / 2, rect.y - 8, 13, '#4a3220', 800, 'center');
  if (sub) text(ctx, sub, rect.x + rect.w / 2, rect.y + rect.h + 16, 11, '#7a6a4f', 600, 'center');
}

function progressRing(ctx, x, y, radius, progress, color) {
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();
}

function progressBar(ctx, x, y, w, progress, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundRect(ctx, x, y, w, 9, 4);
  ctx.fill();
  ctx.fillStyle = color;
  if (progress > 0) {
    roundRect(ctx, x, y, Math.max(9, w * progress), 9, 4);
    ctx.fill();
  }
}

function drawHeart(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.9);
  ctx.bezierCurveTo(x - size * 1.2, y, x - size * 0.6, y - size, x, y - size * 0.35);
  ctx.bezierCurveTo(x + size * 0.6, y - size, x + size * 1.2, y, x, y + size * 0.9);
  ctx.fill();
}

function drawTicket(ctx, order, x, y, w, h) {
  const recipe = RECIPE_BY_ID[order.recipeId];
  const fraction = Math.max(0, order.patience / order.maxPatience);
  const urgent = fraction < 0.35;
  ctx.save();
  if (urgent && Math.floor(order.patience * 2) % 2 === 0) ctx.translate(1.5, 0);
  ctx.fillStyle = PALETTE.ticket;
  ctx.strokeStyle = urgent ? PALETTE.danger : PALETTE.ticketEdge;
  ctx.lineWidth = urgent ? 3 : 2;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = recipe.color;
  roundRect(ctx, x, y, 10, h, 5);
  ctx.fill();
  text(ctx, `#${order.id} ${recipe.name}`, x + 20, y + 22, 15, PALETTE.text, 800);
  let ix = x + 20;
  for (const kind of recipe.items) {
    drawIngredient(ctx, kind, ix + 11, y + 44, 22);
    ix += 28;
  }
  const barColor = fraction > 0.55 ? '#4caf50' : fraction > 0.3 ? '#ff9800' : PALETTE.danger;
  progressBar(ctx, x + 20, y + h - 16, w - 40, fraction, barColor);
  text(ctx, `${Math.ceil(order.patience)}s`, x + w - 12, y + 22, 13, urgent ? PALETTE.danger : '#7a6a4f', 800, 'right');
  ctx.restore();
}

function drawChef(ctx, world) {
  const chef = world.chef;
  const bob = chef.moving ? Math.sin(world.time * 14) * 2 : 0;
  ctx.save();
  ctx.translate(chef.x, chef.y + bob);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, CHEF.radius * 0.85, CHEF.radius * 0.9, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body and apron.
  ctx.fillStyle = PALETTE.chef;
  ctx.beginPath();
  ctx.arc(0, 0, CHEF.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.apron;
  ctx.beginPath();
  ctx.arc(0, 4, CHEF.radius * 0.78, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.closePath();
  ctx.fill();
  // Face.
  ctx.fillStyle = '#2b1d12';
  ctx.beginPath();
  ctx.arc(-8 * chef.facing, -6, 2.6, 0, Math.PI * 2);
  ctx.arc(8 * chef.facing, -6, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b1d12';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 2, 7, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Toque.
  ctx.fillStyle = PALETTE.chefHat;
  ctx.beginPath();
  ctx.arc(-12, -CHEF.radius - 2, 9, 0, Math.PI * 2);
  ctx.arc(0, -CHEF.radius - 8, 10, 0, Math.PI * 2);
  ctx.arc(12, -CHEF.radius - 2, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-16, -CHEF.radius - 4, 32, 8);
  // Carried item floats above the toque.
  if (chef.carrying) {
    const cy = -CHEF.radius - 34;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.arc(0, cy, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d9c08a';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawIngredient(ctx, chef.carrying.kind, 0, cy, 30, chef.carrying.state);
  }
  ctx.restore();
}

function drawStations(ctx, world) {
  // Pantry bins down the left wall.
  for (const bin of STATIONS.bins) {
    const ing = INGREDIENTS[bin.ingredient];
    ctx.fillStyle = '#8a5a33';
    roundRect(ctx, bin.x, bin.y, bin.w, bin.h, 10);
    ctx.fill();
    ctx.fillStyle = '#a9743f';
    roundRect(ctx, bin.x + 5, bin.y + 5, bin.w - 10, bin.h - 10, 7);
    ctx.fill();
    drawIngredient(ctx, bin.ingredient, bin.x + 30, bin.y + bin.h / 2, 46);
    text(ctx, ing.name, bin.x + 58, bin.y + 32, 14, '#fff6df', 800);
    text(ctx, ing.prep === 'ready' ? 'ready to plate' : `needs ${ing.prep}`, bin.x + 58, bin.y + 52, 11, '#f3ddb0', 600);
    text(ctx, '∞', bin.x + bin.w - 14, bin.y + 32, 14, '#f3ddb0', 800, 'right');
  }
  text(ctx, 'PANTRY', 92, 108, 13, PALETTE.cream, 800, 'center');

  // Chopping board.
  const board = STATIONS.board;
  ctx.fillStyle = '#7a5230';
  roundRect(ctx, board.x - 6, board.y - 6, board.w + 12, board.h + 12, 12);
  ctx.fill();
  ctx.fillStyle = PALETTE.board;
  roundRect(ctx, board.x, board.y, board.w, board.h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(board.x + 12, board.y + (board.h / 4) * i);
    ctx.lineTo(board.x + board.w - 12, board.y + (board.h / 4) * i);
    ctx.stroke();
  }
  drawStationLabel(ctx, board, 'CHOPPING BOARD', 'lettuce · tomato');
  if (world.board.item) {
    drawIngredient(ctx, world.board.item.kind, board.x + board.w / 2, board.y + board.h / 2 - 6, 64, world.board.item.state);
    if (world.board.progress < 1) {
      progressRing(ctx, board.x + board.w / 2, board.y + board.h / 2 - 6, 44, world.board.progress, '#ff8c42');
      text(ctx, 'CHOPPING…', board.x + board.w / 2, board.y + board.h - 14, 12, '#fff', 800, 'center');
    }
  } else {
    text(ctx, 'drop lettuce / tomato', board.x + board.w / 2, board.y + board.h / 2, 13, '#8a6a42', 700, 'center');
  }

  // Grill and fryer: two slots each, with progress bars and flames.
  for (const [key, label, sub] of [['grill', 'GRILL', 'patties'], ['fryer', 'FRYER', 'fries']]) {
    const rect = STATIONS[key];
    const slots = world[key];
    ctx.fillStyle = key === 'grill' ? PALETTE.grill : PALETTE.fryer;
    roundRect(ctx, rect.x - 6, rect.y - 6, rect.w + 12, rect.h + 12, 12);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    drawStationLabel(ctx, rect, label, sub);
    slots.forEach((slot, i) => {
      const cx = rect.x + 66 + i * 132;
      const cy = rect.y + 74;
      ctx.strokeStyle = '#5d6b7d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 46, 0, Math.PI * 2);
      ctx.stroke();
      if (slot.item) {
        drawIngredient(ctx, slot.item.kind, cx, cy - 4, 56, slot.item.state);
        const color = slot.item.state === 'burnt' ? '#222' : slot.progress >= 1 ? '#4caf50' : '#ff9800';
        progressBar(ctx, cx - 42, cy + 44, 84, slot.progress, color);
        if (slot.item.state === 'burnt') text(ctx, 'BURNT!', cx, cy - 56, 13, '#ff6b6b', 800, 'center');
        else if (slot.progress >= 1) text(ctx, 'READY', cx, cy - 56, 13, '#8dff9e', 800, 'center');
      } else {
        text(ctx, 'empty', cx, cy, 12, '#8b93a3', 700, 'center');
      }
    });
  }

  // Assembly plate.
  const plate = STATIONS.plate;
  const ready = world.plateReady;
  ctx.fillStyle = ready ? '#2e7d32' : '#8a5a33';
  roundRect(ctx, plate.x - 6, plate.y - 6, plate.w + 12, plate.h + 12, 12);
  ctx.fill();
  ctx.fillStyle = '#e8dcc0';
  roundRect(ctx, plate.x, plate.y, plate.w, plate.h, 8);
  ctx.fill();
  drawStationLabel(ctx, plate, 'ASSEMBLY');
  ctx.fillStyle = PALETTE.plate;
  ctx.beginPath();
  ctx.ellipse(plate.x + plate.w / 2, plate.y + plate.h / 2 + 8, 66, 48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ready ? '#2e7d32' : '#c9b98f';
  ctx.lineWidth = ready ? 4 : 2;
  ctx.stroke();
  if (world.plate.length === 0) {
    text(ctx, 'plate empty', plate.x + plate.w / 2, plate.y + plate.h / 2 + 12, 12, '#a08c5f', 700, 'center');
  } else {
    world.plate.forEach((kind, i) => {
      drawIngredient(ctx, kind, plate.x + plate.w / 2, plate.y + plate.h / 2 + 14 - i * 16, 52);
    });
  }
  if (ready) {
    text(ctx, 'READY TO SERVE!', plate.x + plate.w / 2, plate.y + plate.h - 12, 14, '#2e7d32', 800, 'center');
  }

  // Serve window with the bell.
  const serve = STATIONS.serve;
  ctx.fillStyle = '#5a3d28';
  roundRect(ctx, serve.x - 6, serve.y - 6, serve.w + 12, serve.h + 12, 12);
  ctx.fill();
  ctx.fillStyle = '#2b1d12';
  roundRect(ctx, serve.x, serve.y, serve.w, serve.h, 8);
  ctx.fill();
  ctx.fillStyle = '#f3e2c2';
  roundRect(ctx, serve.x + 12, serve.y + 12, serve.w - 24, 54, 6);
  ctx.fill();
  drawStationLabel(ctx, serve, 'SERVE WINDOW');
  const bellX = serve.x + serve.w / 2;
  const bellY = serve.y + 108;
  ctx.fillStyle = ready ? '#ffd54f' : '#9aa5b1';
  ctx.beginPath();
  ctx.arc(bellX, bellY, 26, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(bellX - 30, bellY - 2, 60, 6);
  ctx.beginPath();
  ctx.arc(bellX, bellY - 28, 5, 0, Math.PI * 2);
  ctx.fill();
  if (ready) {
    ctx.strokeStyle = 'rgba(255,213,79,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bellX, bellY - 6, 40 + Math.sin(world.time * 6) * 4, 0, Math.PI * 2);
    ctx.stroke();
    text(ctx, 'DING! SERVE NOW', bellX, serve.y + serve.h - 12, 13, '#ffd54f', 800, 'center');
  }

  // Trash.
  const trash = STATIONS.trash;
  ctx.fillStyle = '#3a3f47';
  roundRect(ctx, trash.x, trash.y, trash.w, trash.h, 10);
  ctx.fill();
  ctx.fillStyle = '#4a4f58';
  roundRect(ctx, trash.x + 8, trash.y + 8, trash.w - 16, trash.h - 16, 7);
  ctx.fill();
  drawStationLabel(ctx, trash, 'TRASH');
  const tx = trash.x + trash.w / 2;
  const ty = trash.y + trash.h / 2;
  ctx.fillStyle = '#cfd6dd';
  ctx.beginPath();
  ctx.moveTo(tx - 20, ty - 12);
  ctx.lineTo(tx + 20, ty - 12);
  ctx.lineTo(tx + 16, ty + 22);
  ctx.lineTo(tx - 16, ty + 22);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(tx - 24, ty - 18, 48, 5);
  ctx.fillRect(tx - 4, ty - 26, 8, 8);
}

function drawHud(ctx, world) {
  ctx.fillStyle = PALETTE.hud;
  ctx.fillRect(0, 0, FIELD.width, 100);
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.fillRect(0, 100, FIELD.width, 4);
  text(ctx, 'SIZZLE & SERVE', 16, 26, 17, '#ffd54f', 800);
  text(ctx, 'The Golden Skillet', 16, 46, 11, '#d8c49a', 600);

  // Order board: up to three tickets.
  if (world.orders.length === 0) {
    ctx.fillStyle = 'rgba(255,248,231,0.12)';
    roundRect(ctx, 250, 12, 300, 76, 10);
    ctx.fill();
    text(ctx, 'Orders will appear here…', 400, 58, 14, '#d8c49a', 700, 'center');
  }
  world.orders.forEach((order, i) => {
    drawTicket(ctx, order, 250 + i * 232, 12, 222, 76);
  });

  // Shift timer, score, combo, hearts on the right.
  const rightX = 1248;
  const urgent = world.timeLeft <= 30;
  text(ctx, `TIME ${formatTime(world.timeLeft)}`, rightX, 30, 26, urgent ? '#ff6b6b' : '#fff6df', 800, 'right');
  text(ctx, `SCORE ${world.score}`, rightX, 56, 15, '#fff6df', 800, 'right');
  for (let i = 0; i < 3; i += 1) {
    drawHeart(ctx, rightX - 12 - i * 30, 76, 9, i < world.hearts ? '#ff5b6e' : '#5a4632');
  }
  if (world.combo > 1) text(ctx, `COMBO x${world.combo}`, rightX - 120, 56, 15, '#ff8c42', 800, 'right');
  // Shift progress under the HUD.
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(0, 104, FIELD.width, 4);
  ctx.fillStyle = '#ffd54f';
  ctx.fillRect(0, 104, FIELD.width * (world.time / SHIFT_SECONDS), 4);
}

function drawFloor(ctx) {
  ctx.fillStyle = PALETTE.wallTop;
  ctx.fillRect(0, 104, FIELD.width, 8);
  const tile = 64;
  for (let y = 112; y < FIELD.height; y += tile) {
    for (let x = 0; x < FIELD.width; x += tile) {
      const even = ((x / tile) + (y / tile)) % 2 === 0;
      ctx.fillStyle = even ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(x, y, tile, tile);
    }
  }
  // The walkable floor, subtly outlined.
  ctx.strokeStyle = 'rgba(61,43,31,0.25)';
  ctx.lineWidth = 3;
  roundRect(ctx, FLOOR.x - 8, FLOOR.y - 8, FLOOR.w + 16, FLOOR.h + 16, 14);
  ctx.stroke();
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(20,12,6,0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = '#fff8e7';
  roundRect(ctx, 340, 150, 600, 420, 18);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.stroke();
  text(ctx, title, 640, 220, 40, '#2b1d12', 800, 'center');
  let y = 268;
  for (const line of lines) {
    text(ctx, line, 640, y, 16, '#5a4632', 600, 'center');
    y += 30;
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = FIELD.width * dpr;
  canvas.height = FIELD.height * dpr;
  ctx.scale(dpr, dpr);

  function draw(world, screen) {
    ctx.save();
    if (world.shake > 0) {
      ctx.translate((Math.random() - 0.5) * world.shake * 18, (Math.random() - 0.5) * world.shake * 18);
    }
    drawFloor(ctx);
    drawStations(ctx, world);
    drawHud(ctx, world);
    drawChef(ctx, world);

    // Particles and floating score text.
    for (const p of world.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const f of world.floaters) {
      ctx.globalAlpha = Math.max(0, f.ttl / f.max);
      text(ctx, f.text, f.x, f.y, 26, f.color, 800, 'center');
    }
    ctx.globalAlpha = 1;

    // Toast message above the floor.
    if (world.messageTtl > 0 && world.message) {
      ctx.fillStyle = 'rgba(43,29,18,0.92)';
      const w = ctx.measureText(world.message).width + 120;
      roundRect(ctx, 640 - w / 2, 648, w, 36, 18);
      ctx.fill();
      text(ctx, world.message, 640, 672, 15, '#fff6df', 700, 'center');
    }

    // Controls hint, tucked inside the floor above its outline.
    text(ctx, 'WASD / arrows move · E or click: use station · Q: clear plate · P: pause · M: mute', 640, 700, 12, '#7a6a4f', 600, 'center');

    if (screen === SCREEN_TITLE) {
      drawOverlay(ctx, 'SIZZLE & SERVE', [
        'You run The Golden Skillet. Orders roll in on the board —',
        'grab ingredients from the pantry, chop, grill and fry them,',
        'build each dish on the assembly plate, then ring the bell',
        'to serve before the customer walks out!',
        '',
        'Bun & cheese are ready to plate. Lettuce & tomato need',
        'chopping, patties need the grill, fries need the fryer.',
        'Serve fast for a time bonus — chain serves for a combo!',
        '',
        'Press ENTER or click to start your shift.',
      ], '#ff8c42');
    } else if (screen === SCREEN_PAUSED) {
      drawOverlay(ctx, 'PAUSED', ['Take a breath, chef.', '', 'Press P or click to get back to the pass.'], '#ffd54f');
    } else if (screen === SCREEN_OVER) {
      const done = world.overReason === 'done';
      const lines = [
        done ? 'The dinner shift is over!' : 'Too many customers walked out…',
        '',
        `Dishes served: ${world.served}      Missed orders: ${world.missed}`,
        `Best combo: x${world.bestCombo}      Final score: ${world.score}`,
        `Best score: ${world.best}`,
        '',
        'Press R or click to play again.',
      ];
      drawOverlay(ctx, done ? 'SHIFT COMPLETE!' : 'KITCHEN CLOSED', lines, done ? '#4caf50' : '#e5484d');
    }
    ctx.restore();
  }

  return { draw };
}
