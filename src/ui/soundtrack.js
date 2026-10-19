import { hit, hold, rest, shape } from './music.js';

/**
 * Eggscape the Storm: an orchestra, playing as if the sky were coming down.
 *
 * D minor, a bar a chord: Dm Dm Bb Bb Gm Eb C#dim7 A. The E flat is the
 * Neapolitan — a semitone above home, where dread lives — and the diminished
 * seventh after it is the oldest storm in the book, every note of it a minor
 * third from the next, so it could fall anywhere. The A drags it back to D.
 *
 * Over that, the horns play the Dies Irae, the day of wrath, which composers
 * have reached for whenever something terrible was on its way: F E F D E C D
 * D. Under it, the basses saw at one note like something that will not stop,
 * and the timpani keep the D and the A as timpani always have.
 *
 * It builds with distance, a section at a time: basses, cellos and timpani
 * first; then the horns and the upper strings; then trombones, the bass drum
 * and the violins shaking on their strings; and last the choir and the violins
 * up high.
 */

const BARS = [
  { root: 'd2', low: 'd2+a2', mid: 'd3+f3+a3', high: 'a3+d4+f4', choir: 'f3+a3+d4', brass: 'd3+a3', violin: 'a4+d5' },
  { root: 'd2', low: 'd2+a2', mid: 'd3+f3+a3', high: 'a3+d4+f4', choir: 'f3+a3+d4', brass: 'd3+a3', violin: 'a4+f5' },
  { root: 'bb1', low: 'bb1+f2', mid: 'd3+f3+bb3', high: 'bb3+d4+f4', choir: 'f3+bb3+d4', brass: 'bb2+f3', violin: 'bb4+d5' },
  { root: 'bb1', low: 'bb1+f2', mid: 'd3+f3+bb3', high: 'bb3+d4+f4', choir: 'f3+bb3+d4', brass: 'bb2+f3', violin: 'bb4+f5' },
  { root: 'g1', low: 'g1+d2', mid: 'd3+g3+bb3', high: 'bb3+d4+g4', choir: 'g3+bb3+d4', brass: 'g2+d3', violin: 'bb4+g5' },
  { root: 'eb2', low: 'eb2+bb2', mid: 'eb3+g3+bb3', high: 'bb3+eb4+g4', choir: 'g3+bb3+eb4', brass: 'eb3+bb3', violin: 'bb4+g5' },
  { root: 'c#2', low: 'c#2+g2', mid: 'e3+g3+bb3', high: 'bb3+c#4+e4', choir: 'g3+bb3+e4', brass: 'c#3+g3', violin: 'bb4+e5' },
  { root: 'a1', low: 'a1+e2', mid: 'c#3+e3+a3', high: 'a3+c#4+e4', choir: 'e3+a3+c#4', brass: 'a2+e3', violin: 'a4+c#5' },
];

const each = (write) => BARS.map(write).join(' | ');

/** The basses, sawing at the root in eighths with a kick at the front of
 *  each half bar: the thing that will not stop. */
const sawing = ({ root }) => `${root}! ${root}? ${root} . ${root} . ${root} . ${root}! ${root}? ${root} . ${root} . ${root} .`;

/** Timpani on the D and the A, as they have always been tuned — and a roll
 *  that swells on the last bar, into the top again. */
const TIMPANI = [
  'd2! . . . . . . . a1 . . . . . . .',
  'd2! . . . . . . . a1 . . . a1 . . .',
  'd2! . . . . . . . a1 . . . . . . .',
  'd2! . . . . . . . a1 . . . a1 . . .',
  'd2! . . . . . . . a1 . . . . . . .',
  'd2! . . . . . . . a1 . . . a1 . . .',
  'a1! . . . . . . . a1 . . . a1 . . .',
  'a1? a1? a1? a1? a1? a1? a1? a1? a1 a1 a1 a1 a1! a1! a1! a1!',
].join(' | ');

/** Dies irae, dies illa — and the horns carry on past where the chant
 *  stops, into the dark of the last four bars. */
const DIES_IRAE = [
  'f4 - - - e4 - - - f4 - - - d4 - - -',
  'e4 - - - c4 - - - d4 - - . d4 - - -',
  'f4 - - - f4 - - - g4 - - - f4 - - -',
  'd4 - - - bb3 - - - d4 - - - - - - -',
  rest(16),
  'eb4 - - - - - - - - - - - bb3 - - -',
  'g4 - - - - - - - e4 - - - - - - -',
  'e4 - - - - - - - c#4 - - - - - - -',
].join(' | ');

/** The violins up high, in long notes, falling where the horns rise. */
const DESCANT = [
  'a5 - - - - - - - - - - - g5 - f5 -',
  'e5 - - - - - - - d5 - - - - - - -',
  'd5 - - - - - - - f5 - - - - - - -',
  'bb5 - - - - - - - a5 - - - g5 - - -',
  'g5 - - - - - - - - - - - bb5 - a5 -',
  'g5 - - - - - - - eb5 - - - - - - -',
  'e5 - - - - - - - g5 - - - bb5 - - -',
  'a5 - - - - - - - - - - - c#5 - e5 -',
].join(' | ');

/** The title: the chant on a celesta, slowly, as if from a music box left
 *  out in the rain. */
const MUSIC_BOX = [
  'f5 . . . e5 . . . f5 . . . d5 . . .',
  'e5 . . . c5 . . . d5 . . . d5 . . .',
  rest(16),
  rest(16),
  'f5 . . . f5 . . . g5 . . . f5 . . .',
  'e5 . . . d5 . . . c#5 . . . d5 . . .',
  rest(16),
  rest(16),
].join(' | ');

/** And the title's own harmony, slower: two bars a chord. */
const SLOW = ['d2+a2', 'd2+a2', 'bb1+f2', 'bb1+f2', 'g1+d2', 'g1+d2', 'a1+e2', 'a1+e2'];
const SLOW_UPPER = ['d3+f3+a3', 'd3+f3+a3', 'd3+f3+bb3', 'd3+f3+bb3', 'd3+g3+bb3', 'd3+g3+bb3', 'c#3+e3+a3', 'c#3+e3+a3'];

function instruments({ voice }) {
  let lastViolin = null;

  /**
   * A string section: for every note, three players a few cents apart, each
   * with a vibrato of their own, bowed — so it swells in rather than starts —
   * and through a body that takes the fizz off the saws.
   */
  function section(note, freqs, { bright = 2400, players = 3, spread = 9 }) {
    const body = note.filter('lowpass', bright, 0.6);
    const floor = note.filter('highpass', 70, 0.5);
    body.connect(floor);
    for (const freq of freqs) {
      for (let p = 0; p < players; p++) {
        const cents = (p - (players - 1) / 2) * spread;
        const osc = note.osc('sawtooth', freq, cents);
        note.wobble(osc.detune, 5 + p * 0.37, 9, 0.35);
        osc.connect(body);
      }
    }
    return floor;
  }

  return {
    /** Sustained strings, bowed: slow in, and a long release into the hall. */
    strings(out, t, dur, freqs, vel) {
      const note = voice(t);
      const sound = section(note, freqs, { bright: 2200 });
      const amp = note.gain();
      sound.connect(amp).connect(out);
      note.play(shape(amp.gain, t, dur, {
        peak: (0.16 * vel) / freqs.length, attack: 0.5, decay: 1.2, sustain: 0.85, release: 0.9,
      }));
    },

    /** The low strings, darker. */
    cellos(out, t, dur, freqs, vel) {
      const note = voice(t);
      const sound = section(note, freqs, { bright: 1100 });
      const amp = note.gain();
      sound.connect(amp).connect(out);
      note.play(shape(amp.gain, t, dur, {
        peak: (0.22 * vel) / freqs.length, attack: 0.6, decay: 1.5, sustain: 0.9, release: 1.1,
      }));
    },

    /** Tremolo: the bow shaking on the string, the sound of a storm in every
     *  film since there were films. */
    tremolo(out, t, dur, freqs, vel) {
      const note = voice(t);
      const sound = section(note, freqs, { bright: 3000, players: 2 });
      const shake = note.gain(0.55);
      note.wobble(shake.gain, 13, 0.45);
      const amp = note.gain();
      sound.connect(shake).connect(amp).connect(out);
      note.play(shape(amp.gain, t, dur, {
        peak: (0.14 * vel) / freqs.length, attack: 0.9, decay: 1, sustain: 0.9, release: 0.6,
      }));
    },

    /** Basses, played short and hard, near the frog. */
    basses(out, t, _dur, [freq], vel) {
      const note = voice(t);
      const body = note.filter('lowpass', 500 + 500 * vel, 1.2);
      for (const cents of [-8, 0, 8]) note.osc('sawtooth', freq, cents).connect(body);
      const amp = note.gain();
      body.connect(amp).connect(out);
      note.play(hit(amp.gain, t, 0.2, 0.32 * vel, 0.012));
    },

    /** The violins up high, sliding a little into each note, as a section
     *  does when it is playing its heart out. */
    violins(out, t, dur, [freq], vel) {
      const note = voice(t);
      const from = lastViolin && Math.abs(Math.log2(lastViolin / freq)) < 1 ? lastViolin : freq;
      lastViolin = freq;
      const body = note.filter('lowpass', 3400, 0.7);
      for (const cents of [-10, -3, 4, 11]) {
        const osc = note.osc('sawtooth', from, cents);
        osc.frequency.exponentialRampToValueAtTime(freq, t + 0.12);
        note.wobble(osc.detune, 5.4 + cents * 0.03, 14, 0.4);
        osc.connect(body);
      }
      const amp = note.gain();
      body.connect(amp).connect(out);
      note.play(shape(amp.gain, t, dur, {
        peak: 0.085 * vel, attack: 0.35, decay: 1, sustain: 0.85, release: 0.7,
      }));
    },

    /**
     * Brass: a saw whose filter opens as the note swells, which is what makes
     * a horn a horn and not an organ — it gets brighter as it gets louder.
     */
    horns(out, t, dur, freqs, vel) {
      const note = voice(t);
      const bell = note.filter('lowpass', 350, 1.5);
      bell.frequency.linearRampToValueAtTime(900 + 900 * vel, t + 0.18);
      bell.frequency.setTargetAtTime(700 + 500 * vel, t + 0.2, 0.4);
      for (const freq of freqs) {
        for (const cents of [-5, 5]) {
          const osc = note.osc('sawtooth', freq, cents);
          note.wobble(osc.detune, 4.8, 5, 0.5);
          osc.connect(bell);
        }
      }
      const amp = note.gain();
      bell.connect(amp).connect(out);
      note.play(shape(amp.gain, t, dur, {
        peak: (0.2 * vel) / freqs.length, attack: 0.09, decay: 0.8, sustain: 0.75, release: 0.35,
      }));
    },

    /** Trombones: the same, lower, and hit hard — a blow, then let ring. */
    trombones(out, t, dur, freqs, vel) {
      const note = voice(t);
      const bell = note.filter('lowpass', 400, 2);
      bell.frequency.linearRampToValueAtTime(1600 * vel, t + 0.05);
      bell.frequency.setTargetAtTime(500, t + 0.06, 0.25);
      for (const freq of freqs) {
        for (const cents of [-6, 6]) note.osc('sawtooth', freq, cents).connect(bell);
      }
      const amp = note.gain();
      bell.connect(amp).connect(out);
      note.play(shape(amp.gain, t, dur, {
        peak: (0.3 * vel) / freqs.length, attack: 0.03, decay: 0.35, sustain: 0.4, release: 0.5,
      }));
    },

    /** A kettle drum: a tuned skin that sags a little in pitch as it rings,
     *  and the thud of the stick. */
    timpani(out, t, _dur, [freq], vel) {
      const note = voice(t);
      const skin = note.osc('sine', freq * 1.04);
      skin.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
      const over = note.osc('sine', freq * 1.5);
      const overAmp = note.gain();
      over.connect(overAmp);
      hit(overAmp.gain, t, 0.4, 0.3 * vel);
      const amp = note.gain();
      skin.connect(amp);
      overAmp.connect(amp);
      amp.connect(out);
      const stick = note.noise();
      const thud = note.filter('lowpass', 420, 0.8);
      const stickAmp = note.gain();
      stick.connect(thud).connect(stickAmp).connect(out);
      hit(stickAmp.gain, t, 0.06, 0.6 * vel);
      note.play(hit(amp.gain, t, 1.3, 0.7 * vel, 0.003));
    },

    /** The bass drum, the big one, hit once a bar and felt more than heard. */
    drum(out, t, _dur, _freqs, vel) {
      const note = voice(t);
      const skin = note.osc('sine', 58);
      skin.frequency.exponentialRampToValueAtTime(38, t + 0.6);
      const amp = note.gain();
      skin.connect(amp).connect(out);
      const air = note.noise();
      const low = note.filter('lowpass', 220, 0.7);
      const airAmp = note.gain();
      air.connect(low).connect(airAmp).connect(out);
      hit(airAmp.gain, t, 0.7, 0.4 * vel, 0.004);
      note.play(hit(amp.gain, t, 1.4, 0.75 * vel, 0.004));
    },

    /** A tam-tam: a great gong, struck once, with partials that do not
     *  agree with each other or with anything else. */
    gong(out, t, _dur, [freq], vel) {
      const note = voice(t);
      const amp = note.gain();
      for (const [ratio, level, ring] of [[1, 0.6, 5], [1.41, 0.45, 4.5], [2.13, 0.4, 4], [2.98, 0.3, 3], [4.37, 0.18, 2.4]]) {
        const osc = note.osc('sine', freq * ratio);
        const partial = note.gain();
        osc.connect(partial).connect(amp);
        hit(partial.gain, t, ring, level, 0.02);
      }
      const wash = note.noise();
      const band = note.filter('bandpass', 1800, 0.6);
      const washAmp = note.gain();
      wash.connect(band).connect(washAmp).connect(amp);
      shape(washAmp.gain, t, 0.3, { peak: 0.25, attack: 0.3, decay: 3, sustain: 0, release: 1 });
      amp.connect(out);
      note.play(hit(amp.gain, t, 6, 0.3 * vel, 0.01));
    },

    /** Voices with no words: saws through the formants of an "ah", every
     *  singer with a vibrato of their own. */
    choir(out, t, dur, freqs, vel) {
      const note = voice(t);
      const mouth = note.gain(1);
      for (const freq of freqs) {
        for (const cents of [-7, 0, 7]) {
          const osc = note.osc('sawtooth', freq, cents);
          note.wobble(osc.detune, 4.6 + cents * 0.05, 14, 0.8);
          osc.connect(mouth);
        }
      }
      const amp = note.gain();
      for (const [f, q, level] of [[700, 7, 1], [1150, 8, 0.6], [2600, 9, 0.18]]) {
        const formant = note.filter('bandpass', f, q);
        const formantAmp = note.gain(level);
        mouth.connect(formant).connect(formantAmp).connect(amp);
      }
      amp.connect(out);
      note.play(shape(amp.gain, t, dur, {
        peak: (0.42 * vel) / freqs.length, attack: 1.2, decay: 1.5, sustain: 0.85, release: 1.6,
      }));
    },

    /** A celesta: little hammers on steel bars, sweet and a bit wrong. */
    celesta(out, t, _dur, [freq], vel) {
      const note = voice(t);
      const amp = note.gain();
      for (const [ratio, level, ring] of [[1, 1, 1.6], [2, 0.3, 0.8], [4.02, 0.12, 0.35]]) {
        const osc = note.osc('sine', freq * ratio);
        const partial = note.gain();
        osc.connect(partial).connect(amp);
        hit(partial.gain, t, ring, level, 0.002);
      }
      amp.connect(out);
      note.play(hit(amp.gain, t, 1.8, 0.2 * vel, 0.002));
    },

    /** Everything going out at once, which is what being struck is: the
     *  brass falling off its note. */
    drop(out, t, dur, [freq], vel) {
      const note = voice(t);
      const bell = note.filter('lowpass', 1800, 2);
      bell.frequency.exponentialRampToValueAtTime(120, t + dur);
      for (const cents of [-6, 6]) {
        const osc = note.osc('sawtooth', freq, cents);
        osc.frequency.exponentialRampToValueAtTime(freq / 4, t + dur);
        osc.connect(bell);
      }
      const amp = note.gain();
      bell.connect(amp).connect(out);
      note.play(shape(amp.gain, t, dur, {
        peak: 0.3 * vel, attack: 0.02, decay: dur, sustain: 0.6, release: 0.6,
      }));
    },
  };
}

export const SOUNDTRACK = {
  volume: 0.24,
  space: {
    /** A cathedral, more or less: long, and dark at the top. */
    reverb: { seconds: 4.5, decay: 2.4, level: 1.1 },
    echo: { beats: 1, feedback: 0.3, tone: 1400 },
  },
  instruments,

  /** The further into the storm, the more of the orchestra is playing. */
  level(snapshot) {
    if (snapshot.state !== 'running') return 0;
    const depth = snapshot.distance;
    return depth < 100 ? 0 : depth < 300 ? 1 : depth < 600 ? 2 : 3;
  },

  cues: {
    /** Between runs: low strings, the chant on a celesta, the choir barely
     *  there, and a gong once round. */
    title: {
      bpm: 60,
      parts: [
        { play: 'cellos', gain: 1, wet: 0.5, notes: SLOW.map((chord) => hold(chord, 16)).join(' | ') },
        { play: 'strings', gain: 0.6, wet: 0.6, notes: SLOW_UPPER.map((chord) => hold(chord, 16)).join(' | ') },
        { play: 'celesta', gain: 1.4, wet: 0.6, echo: 0.35, pan: -0.2, notes: MUSIC_BOX },
        { play: 'choir', gain: 0.5, wet: 0.7, notes: `${rest(64)} ${hold('f3+a3+d4', 32)} ${hold('e3+a3+c#4', 32)}` },
        { play: 'timpani', gain: 0.5, wet: 0.5, notes: `d2 ${rest(63)} a1 ${rest(63)}` },
        { play: 'gong', gain: 0.5, wet: 0.6, notes: `d2 ${rest(127)}` },
      ],
    },

    run: {
      bpm: 104,
      parts: [
        { play: 'basses', gain: 1, pan: 0.15, wet: 0.2, notes: each(sawing) },
        { play: 'cellos', gain: 0.9, wet: 0.35, pan: 0.1, notes: each(({ low }) => hold(low, 16)) },
        { play: 'timpani', gain: 0.8, wet: 0.4, notes: TIMPANI },
        { play: 'horns', gain: 1, at: 1, wet: 0.45, pan: -0.25, notes: DIES_IRAE },
        { play: 'strings', gain: 0.9, at: 1, wet: 0.45, pan: -0.1, notes: each(({ mid }) => hold(mid, 16)) },
        { play: 'trombones', gain: 0.9, at: 2, wet: 0.45, pan: 0.25, notes: each(({ brass }) => `${hold(brass, 6)} ${rest(10)}`) },
        { play: 'drum', gain: 0.8, at: 2, wet: 0.5, notes: 'x . . . . . . . . . . . . . . .' },
        { play: 'tremolo', gain: 0.8, at: 2, wet: 0.45, pan: 0.3, notes: each(({ high }) => hold(high, 16)) },
        { play: 'choir', gain: 0.75, at: 3, wet: 0.6, notes: each(({ choir }) => hold(choir, 16)) },
        { play: 'violins', gain: 1, at: 3, wet: 0.5, echo: 0.15, pan: -0.3, notes: DESCANT },
      ],
    },

    /** Struck: the brass falling off its note, the gong, the timpani, and a
     *  chord with no business anywhere. */
    over: {
      bpm: 104,
      once: true,
      then: 'title',
      parts: [
        { play: 'drop', gain: 0.9, wet: 0.5, notes: `${hold('d3+a3', 16)} ${rest(16)}` },
        { play: 'strings', gain: 1, wet: 0.7, notes: `${hold('d3+eb3+ab3', 24)} ${rest(8)}` },
        { play: 'gong', gain: 1, wet: 0.6, notes: `d2 ${rest(31)}` },
        { play: 'timpani', gain: 1, wet: 0.5, notes: `d2! . . . a1 . . . d2 . . . . . . . ${rest(16)}` },
      ],
    },
  },
};
