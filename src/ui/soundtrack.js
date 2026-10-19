import { hit, hold, rest, shape } from './music.js';

/**
 * Eggscape the Storm: dark, driving, and wet. A deep kick on every beat, a
 * bass galloping on the offbeats under it, and rain all the way through —
 * noise ticking on the sixteenths, never twice the same way in a bar.
 *
 * D minor, round Dm Dm Bb Bb Gm Gm A A. The A is the storm: a major chord
 * where the key wants a minor one, its C sharp pulling hard back home, so
 * the loop never quite settles before it starts again.
 */

const CHORDS = [
  { root: 'd2', pad: 'd3+f3+a3', drops: ['a5', 'f5', 'd5'] },
  { root: 'd2', pad: 'd3+f3+a3', drops: ['a5', 'f5', 'd5'], turn: 'd3' },
  { root: 'bb1', pad: 'd3+f3+bb3', drops: ['f5', 'd5', 'bb4'] },
  { root: 'bb1', pad: 'd3+f3+bb3', drops: ['f5', 'd5', 'bb4'], turn: 'bb2' },
  { root: 'g1', pad: 'd3+g3+bb3', drops: ['d5', 'bb4', 'g4'] },
  { root: 'g1', pad: 'd3+g3+bb3', drops: ['d5', 'bb4', 'g4'], turn: 'g2' },
  { root: 'a1', pad: 'c#3+e3+a3', drops: ['e5', 'c#5', 'a4'] },
  { root: 'a1', pad: 'c#3+e3+a3', drops: ['e5', 'c#5', 'a4'], turn: 'a2' },
];

const each = (write) => CHORDS.map(write).join(' | ');

/** Off every beat, and the sixteenth after it: a gallop. A turn jumps the
 *  octave at the end of the bar. */
const gallop = ({ root, turn }) => {
  const beat = `. . ${root} ${root}`;
  return [beat, beat, beat, turn ? `. . ${turn} ${root}` : beat].join(' ');
};

/** The drops: the chord falling, three notes against four beats, so they
 *  never land the same way twice in a bar — and mostly gaps, like rain. */
const falling = ({ drops }) => Array.from({ length: 16 }, (_, i) => {
  if (i % 3 === 2) return '.';
  return drops[i % 3] + (i % 4 ? '?' : '');
}).join(' ');

const FOUR = 'x . . . x . . . x . . . x . . .';

/** Rain on a roof: sixteenths, loud and soft in no order a hand would choose. */
const PATTER = [
  'o x o o x o o x o o x o x o o x',
  'o o x o x o o x o x o o x o x x',
].join(' | ');

const LEAD = [
  'a4 - - - d5 - - - f5 - e5 - d5 - - -',
  'c5 - - - d5 - - - a4 - - - - - - -',
  'bb4 - - - d5 - - - f5 - g5 - f5 - - -',
  'd5 - - - f5 - - - bb4 - - - - - - -',
  'g4 - - - bb4 - - - d5 - c5 - bb4 - - -',
  'a4 - - - bb4 - - - g4 - - - - - - -',
  'e5 - - - c#5 - - - e5 - g5 - f5 - - -',
  'e5 - - - c#5 - - - a4 - - - - - - -',
].join(' | ');

/** The title: the same chords slowed right down, a few drops, and thunder a
 *  long way off. */
const DRIFT = [
  '. . . . a5 . . . . . d6 . . . . .',
  '. . f5 . . . . . . . . . a5 . . .',
  '. . . . f5 . . . . . bb5 . . . . .',
  '. . d6 . . . . . . . . . . . f5 .',
  '. . . . d5 . . . . . g5 . . . . .',
  '. . bb5 . . . . . . . . . d6 . . .',
  '. . . . e5 . . . . . a5 . . . . .',
  '. . c#6 . . . . . . . . . e5 . . .',
].join(' | ');

function instruments({ voice }) {
  let lastLead = null;

  return {
    /** Deep and round, with a little air on the front of it. */
    kick(out, t, _dur, _freqs, vel) {
      const note = voice(t);
      const body = note.osc('sine', 120);
      body.frequency.exponentialRampToValueAtTime(38, t + 0.13);
      const amp = note.gain();
      body.connect(amp).connect(out);
      const click = note.noise();
      const bite = note.filter('highpass', 3200);
      const clickAmp = note.gain();
      click.connect(bite).connect(clickAmp).connect(out);
      hit(clickAmp.gain, t, 0.01, 0.2 * vel);
      note.play(hit(amp.gain, t, 0.42, 1 * vel));
    },

    /** A crack, like a branch going: a clap with a lot of room behind it. */
    crack(out, t, _dur, _freqs, vel) {
      const note = voice(t);
      const src = note.noise();
      const band = note.filter('bandpass', 1900, 0.7);
      const amp = note.gain();
      src.connect(band).connect(amp).connect(out);
      for (let i = 0; i < 3; i++) {
        amp.gain.setValueAtTime(0.8 * vel, t + i * 0.009);
        amp.gain.setTargetAtTime(0.1, t + i * 0.009, 0.003);
      }
      amp.gain.setValueAtTime(0.85 * vel, t + 0.027);
      amp.gain.setTargetAtTime(0, t + 0.027, 0.07);
      note.play(t + 0.45);
    },

    hat(out, t, _dur, _freqs, vel) {
      const note = voice(t);
      const src = note.noise();
      const air = note.filter('highpass', 8000);
      const amp = note.gain();
      src.connect(air).connect(amp).connect(out);
      note.play(hit(amp.gain, t, vel > 1.2 ? 0.18 : 0.035, 0.45 * Math.min(vel, 1)));
    },

    /** One drop of rain: a short click of filtered noise, somewhere high. */
    patter(out, t, _dur, _freqs, vel) {
      const note = voice(t);
      const src = note.noise();
      const band = note.filter('bandpass', 5200 + vel * 3000, 2.2);
      const amp = note.gain();
      src.connect(band).connect(amp).connect(out);
      note.play(hit(amp.gain, t, 0.018, 0.55 * vel));
    },

    /** A saw and a sine under a filter that opens on every note and closes
     *  before the next, so the gallop has a front edge to it. */
    bass(out, t, dur, [freq], vel) {
      const note = voice(t);
      const low = note.filter('lowpass', 150, 5);
      low.frequency.linearRampToValueAtTime(620 * vel, t + 0.01);
      low.frequency.setTargetAtTime(140, t + 0.01, 0.05);
      for (const cents of [-7, 7]) note.osc('sawtooth', freq, cents).connect(low);
      const body = note.osc('sine', freq);
      const bodyAmp = note.gain(0.7);
      body.connect(bodyAmp).connect(low);
      const amp = note.gain();
      low.connect(amp).connect(out);
      note.play(shape(amp.gain, t, dur * 0.85, {
        peak: 0.5 * vel, attack: 0.004, decay: 0.12, sustain: 0.55, release: 0.04,
      }));
    },

    /** A drop of light landing: a sine with a glassy edge, gone at once. */
    drip(out, t, _dur, [freq], vel) {
      const note = voice(t);
      const src = note.osc('sine', freq * 1.02);
      src.frequency.exponentialRampToValueAtTime(freq, t + 0.03);
      const edge = note.osc('triangle', freq * 3);
      const edgeAmp = note.gain(0.08);
      edge.connect(edgeAmp);
      const amp = note.gain();
      src.connect(amp);
      edgeAmp.connect(amp);
      amp.connect(out);
      note.play(hit(amp.gain, t, 0.22, 0.32 * vel));
    },

    /** Strings, nearly: three saws a little apart, slow in and slow out. */
    pad(out, t, dur, freqs, vel) {
      const note = voice(t);
      const low = note.filter('lowpass', 1100, 0.9);
      note.wobble(low.frequency, 0.09, 320);
      for (const freq of freqs) {
        for (const cents of [-12, 0, 12]) note.osc('sawtooth', freq, cents).connect(low);
      }
      const amp = note.gain();
      low.connect(amp).connect(out);
      note.play(shape(amp.gain, t, dur, {
        peak: (0.2 * vel) / freqs.length, attack: 0.9, decay: 1, sustain: 0.85, release: 1.4,
      }));
    },

    /** A square and a triangle, sliding in from wherever it last was, with
     *  a slow vibrato that only arrives on the long notes. */
    lead(out, t, dur, [freq], vel) {
      const note = voice(t);
      const low = note.filter('lowpass', 2200, 1.4);
      const from = lastLead && Math.abs(Math.log2(lastLead / freq)) < 1 ? lastLead : freq;
      lastLead = freq;
      for (const [type, cents] of [['square', 0], ['triangle', -5]]) {
        const osc = note.osc(type, from, cents);
        osc.frequency.exponentialRampToValueAtTime(freq, t + 0.06);
        note.wobble(osc.detune, 5, 16, 0.3);
        osc.connect(low);
      }
      const amp = note.gain();
      low.connect(amp).connect(out);
      note.play(shape(amp.gain, t, dur, {
        peak: 0.24 * vel, attack: 0.03, decay: 0.3, sustain: 0.7, release: 0.25,
      }));
    },

    /** A bell, a long way up: two sines a ratio apart, ringing out. */
    bell(out, t, _dur, [freq], vel) {
      const note = voice(t);
      const src = note.osc('sine', freq);
      const partial = note.osc('sine', freq * 2.76);
      const partialAmp = note.gain(0.25);
      partial.connect(partialAmp);
      const amp = note.gain();
      src.connect(amp);
      partialAmp.connect(amp);
      amp.connect(out);
      note.play(hit(amp.gain, t, 0.6, 0.22 * vel));
    },

    sub(out, t, dur, [freq], vel) {
      const note = voice(t);
      const src = note.osc('sine', freq);
      const amp = note.gain();
      src.connect(amp).connect(out);
      note.play(shape(amp.gain, t, dur, {
        peak: 0.55 * vel, attack: 0.6, decay: 1, sustain: 0.9, release: 1.4,
      }));
    },

    /** Thunder, a long way off: low noise, swelling and dying. */
    roll(out, t, _dur, _freqs, vel) {
      const note = voice(t);
      const src = note.noise();
      const low = note.filter('lowpass', 260, 0.8);
      low.frequency.exponentialRampToValueAtTime(90, t + 2.4);
      const amp = note.gain();
      src.connect(low).connect(amp).connect(out);
      note.play(shape(amp.gain, t, 1.2, {
        peak: 0.9 * vel, attack: 0.25, decay: 1.2, sustain: 0.4, release: 1.2,
      }));
    },

    /** Everything going out at once, which is what being struck is. */
    drop(out, t, dur, [freq], vel) {
      const note = voice(t);
      const src = note.osc('sawtooth', freq);
      src.frequency.exponentialRampToValueAtTime(freq / 8, t + dur);
      const low = note.filter('lowpass', 2000, 3);
      low.frequency.exponentialRampToValueAtTime(120, t + dur);
      const amp = note.gain();
      src.connect(low).connect(amp).connect(out);
      note.play(shape(amp.gain, t, dur, {
        peak: 0.32 * vel, attack: 0.005, decay: dur, sustain: 0.6, release: 0.3,
      }));
    },
  };
}

export const SOUNDTRACK = {
  volume: 0.22,
  space: {
    reverb: { seconds: 3.2, decay: 2.6, level: 1 },
    echo: { beats: 0.75, feedback: 0.45, tone: 2200 },
  },
  instruments,

  /** The further into the storm, the more of the track is playing. */
  level(snapshot) {
    if (snapshot.state !== 'running') return 0;
    const depth = snapshot.distance;
    return depth < 100 ? 0 : depth < 300 ? 1 : depth < 600 ? 2 : 3;
  },

  cues: {
    title: {
      bpm: 84,
      parts: [
        { play: 'pad', gain: 1.25, wet: 0.55, notes: each(({ pad }) => hold(pad, 16)) },
        { play: 'sub', gain: 0.2, notes: each(({ root }) => hold(root, 16)) },
        { play: 'drip', gain: 1.6, echo: 0.6, wet: 0.35, pan: -0.2, notes: DRIFT },
        { play: 'patter', gain: 0.5, pan: 0.3, wet: 0.3, notes: PATTER },
        { play: 'roll', gain: 0.6, wet: 0.5, notes: `x ${rest(63)} ${rest(48)} o ${rest(15)}` },
      ],
    },

    run: {
      bpm: 126,
      parts: [
        { play: 'kick', gain: 0.58, notes: FOUR },
        { play: 'bass', gain: 0.3, notes: each(gallop) },
        { play: 'patter', gain: 0.75, pan: 0.25, wet: 0.2, notes: PATTER },
        { play: 'hat', gain: 1.3, at: 1, pan: -0.2, notes: '. . x . . . x . . . x . . . X .' },
        { play: 'crack', gain: 1.8, at: 1, wet: 0.45, notes: '. . . . x . . . . . . . x . . .' },
        { play: 'drip', gain: 0.9, at: 1, echo: 0.45, pan: -0.35, notes: each(falling) },
        { play: 'pad', gain: 0.8, at: 2, wet: 0.5, notes: each(({ pad }) => hold(pad, 16)) },
        {
          play: 'bell', gain: 1.2, at: 2, echo: 0.55, wet: 0.3, pan: 0.4,
          notes: '. . . . . . . a5 . . . . . . d6 . | . . . f5 . . . . . . . . . . . .',
        },
        { play: 'roll', gain: 0.45, at: 2, wet: 0.4, notes: `x ${rest(127)}` },
        { play: 'lead', gain: 0.42, at: 3, wet: 0.35, echo: 0.3, notes: LEAD },
      ],
    },

    /** Struck: a chord with no business in the key, and the power going. */
    over: {
      bpm: 126,
      once: true,
      then: 'title',
      parts: [
        { play: 'drop', gain: 0.8, wet: 0.45, notes: `${hold('d4', 16)} ${rest(16)}` },
        { play: 'pad', gain: 0.8, wet: 0.6, notes: `${hold('d3+f3+ab3', 16)} ${rest(16)}` },
        { play: 'roll', gain: 1, wet: 0.5, notes: `X ${rest(31)}` },
      ],
    },
  },
};
