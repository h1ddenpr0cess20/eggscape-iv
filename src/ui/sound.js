const VOICES = {
  jump: { from: 380, to: 760, time: 0.12, type: 'triangle', gain: 0.07 },
  land: { from: 200, to: 110, time: 0.08, type: 'triangle', gain: 0.04 },
  spark: { from: 1320, to: 2640, time: 0.11, type: 'sine', gain: 0.07 },
  smash: { from: 900, to: 60, time: 0.28, type: 'sawtooth', gain: 0.06 },
  hit: { from: 260, to: 50, time: 0.35, type: 'sawtooth', gain: 0.09 },
  over: { from: 220, to: 30, time: 1.1, type: 'sawtooth', gain: 0.1 },
  start: { from: 160, to: 640, time: 0.35, type: 'triangle', gain: 0.07 },
};

/** A handful of oscillators' worth of arcade, and the thunder, built on the
 *  first gesture because no browser will start an AudioContext before one. */
export function createSound() {
  let ctx = null;
  let muted = false;
  let noise = null;

  /** Built on the first call and woken on every one after, which is only
   *  ever from inside a gesture: the one place a browser will start it. */
  function wake() {
    if (!ctx) {
      const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    /** A resume that is refused is a run with no sound in it, not an
     *  unhandled rejection in everybody's console. */
    if (ctx.state === 'suspended') ctx.resume()?.catch(() => {});
    return ctx;
  }

  /** Three seconds of brown noise — white noise with the hiss leaked out of
   *  it — which is most of what thunder is. */
  function rumble(audio) {
    if (noise) return noise;
    const length = audio.sampleRate * 3;
    noise = audio.createBuffer(1, length, audio.sampleRate);
    const data = noise.getChannelData(0);
    let last = 0;
    let seed = 1;
    for (let i = 0; i < length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      last = (last + 0.02 * (seed / 2 ** 31 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    return noise;
  }

  return {
    get muted() { return muted; },
    set muted(value) { muted = Boolean(value); },

    /** Whatever a gesture has built so far, and null until one has. The music
     *  plays on this and never builds it: it is never what was just pressed. */
    get context() { return ctx; },

    wake,

    play(name) {
      const voice = VOICES[name];
      if (!voice || muted) return;
      const audio = wake();
      if (!audio) return;

      const now = audio.currentTime;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = voice.type;
      osc.frequency.setValueAtTime(voice.from, now);
      osc.frequency.exponentialRampToValueAtTime(voice.to, now + voice.time);
      gain.gain.setValueAtTime(voice.gain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + voice.time);
      osc.connect(gain).connect(audio.destination);
      osc.start(now);
      osc.stop(now + voice.time + 0.02);
      /** Off the graph once it has been heard. A run plays hundreds of
       *  these, and every one of them stays wired to the destination
       *  until it is let go of. */
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    },

    /**
     * Thunder, `delay` seconds from now: a crack if it is close, and then the
     * roll. Only ever on a context a gesture has already built — the sky is
     * never what was just pressed, either.
     */
    thunder(delay = 0, power = 1) {
      if (muted || !ctx) return;
      const audio = ctx;
      const at = audio.currentTime + Math.max(0, delay);
      const src = audio.createBufferSource();
      src.buffer = rumble(audio);
      src.playbackRate.setValueAtTime(0.7 + Math.random() * 0.5, at);
      const low = audio.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.setValueAtTime(power > 0.8 ? 1400 : 600, at);
      low.frequency.exponentialRampToValueAtTime(110, at + 1.6);
      const gain = audio.createGain();
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.5 * power, at + 0.04);
      gain.gain.setTargetAtTime(0.22 * power, at + 0.05, 0.25);
      gain.gain.setTargetAtTime(0, at + 0.9, 0.6);
      src.connect(low).connect(gain).connect(audio.destination);
      src.start(at, Math.random() * 1.5);
      src.stop(at + 3);
      src.onended = () => {
        src.disconnect();
        low.disconnect();
        gain.disconnect();
      };
    },
  };
}
