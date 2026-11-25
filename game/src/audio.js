// Tiny WebAudio synth: no sound files, everything is an oscillator blip or a
// short burst of filtered noise. Muted until the player first interacts.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      return null;
    }
    return context;
  }

  function tone(freq, seconds, type, volume, when = 0) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const start = ctx.currentTime + when;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + seconds + 0.05);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  function noise(seconds, volume, filterFreq) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    try {
      const length = Math.floor(ctx.sampleRate * seconds);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = filterFreq;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    pickup() {
      tone(520, 0.09, 'sine', 0.12);
    },
    place() {
      tone(340, 0.08, 'triangle', 0.12);
    },
    chop() {
      noise(0.09, 0.25, 900);
    },
    sizzle() {
      noise(0.35, 0.12, 3200);
    },
    ding() {
      tone(880, 0.18, 'sine', 0.14);
      tone(1318, 0.3, 'sine', 0.1, 0.1);
    },
    serve() {
      tone(523, 0.12, 'triangle', 0.14);
      tone(659, 0.12, 'triangle', 0.14, 0.09);
      tone(784, 0.22, 'triangle', 0.16, 0.18);
    },
    error() {
      tone(160, 0.18, 'square', 0.08);
    },
    expire() {
      tone(220, 0.25, 'sawtooth', 0.08);
      tone(165, 0.35, 'sawtooth', 0.08, 0.18);
    },
    tick() {
      tone(980, 0.05, 'sine', 0.07);
    },
  };
}
