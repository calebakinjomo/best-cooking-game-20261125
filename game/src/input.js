// Keyboard and mouse: WASD/arrows move the chef, E or Space interacts with the
// nearest station, Q clears the plate, P pauses, R restarts, M mutes. Clicking
// a station walks the chef toward it and interacts on arrival; clicking the
// floor sets a walk target. Every action is edge-triggered and consumed once.

export const ACTION_INTERACT = 'interact';
export const ACTION_CLEAR = 'clear';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';
export const ACTION_MUTE = 'mute';
export const ACTION_CONFIRM = 'confirm';

const KEY_ACTIONS = {
  KeyE: ACTION_INTERACT,
  Space: ACTION_INTERACT,
  KeyQ: ACTION_CLEAR,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyR: ACTION_RESTART,
  KeyM: ACTION_MUTE,
  Enter: ACTION_CONFIRM,
};

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let click = null;
  let mouse = { x: 0, y: 0 };

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      keys.add(event.code);
      const action = KEY_ACTIONS[event.code];
      if (action) pressed.add(action);
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
  });
  canvas.addEventListener('pointerdown', (event) => {
    const point = toLogical(event);
    mouse = point;
    click = point;
  });
  canvas.addEventListener('pointermove', (event) => {
    mouse = toLogical(event);
  });

  function direction() {
    let x = 0;
    let y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const length = Math.hypot(x, y);
      x /= length;
      y /= length;
    }
    return { x, y };
  }

  return {
    /** Held movement direction, normalised. */
    dir() {
      return direction();
    },
    /** The mouse position in logical coordinates. */
    mouse() {
      return mouse;
    },
    /** The latest click point, if any, since the last frame. */
    takeClick() {
      const point = click;
      click = null;
      return point;
    },
    /** True once per key press; consumed by the caller. */
    takeAction(action) {
      if (!pressed.has(action)) return false;
      pressed.delete(action);
      return true;
    },
    /** True while the action key is held (unused by the loop, kept for tests). */
    hasAction(action) {
      return pressed.has(action);
    },
  };
}
