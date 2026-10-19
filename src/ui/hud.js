const PIP = '◆';

const LEAD = {
  ready: 'It has been raining light for a week. Roll east, take the sparks, and do not be standing where it lands.',
  over: 'Struck. The shell held for as long as a shell can.',
};

/** HTML-safe: every figure on this panel is one of our own numbers, but a
 *  panel that writes unescaped strings is a habit worth not having. */
function safe(text) {
  return String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function stat(label, value) {
  return `<div class="stat"><dt>${safe(label)}</dt><dd>${safe(value)}</dd></div>`;
}

function metres(value) {
  return `${Math.max(0, Math.floor(value))}m`;
}

/**
 * The readouts, and the panel that covers them between runs. Markup lives in
 * index.html; this only ever writes text and flips `hidden`.
 */
export function createHud(doc = document, lives = 3) {
  const $ = (id) => doc.getElementById(id);

  const score = $('score');
  const depth = $('depth');
  const sparks = $('sparks');
  const shells = $('shells');
  const overlay = $('overlay');
  const kicker = $('overlay-kicker');
  const lead = $('overlay-lead');
  const stats = $('overlay-stats');
  const play = $('play');

  function pips(left) {
    return PIP.repeat(Math.max(0, left)) + `<span class="spent">${PIP.repeat(Math.max(0, lives - left))}</span>`;
  }

  /** The readouts are written sixty times a second and change a handful of
   *  times a run, so each one only touches the DOM when its text moves. */
  const shown = {};
  function put(node, key, value, html = false) {
    if (shown[key] === value) return;
    shown[key] = value;
    if (html) node.innerHTML = value;
    else node.textContent = value;
  }

  return {
    update(snapshot) {
      put(score, 'score', String(snapshot.score));
      put(depth, 'depth', metres(snapshot.distance));
      put(sparks, 'sparks', String(snapshot.sparks));
      put(shells, 'shells', pips(snapshot.lives), true);
    },

    ready(best) {
      overlay.hidden = false;
      overlay.dataset.state = 'ready';
      kicker.textContent = 'the sky is falling, marc';
      lead.textContent = LEAD.ready;
      stats.hidden = best <= 0;
      stats.innerHTML = best > 0 ? stat('best', best) : '';
      play.textContent = 'run';
    },

    over(snapshot, best) {
      overlay.hidden = false;
      overlay.dataset.state = 'over';
      kicker.textContent = 'struck by lightning';
      lead.textContent = LEAD.over;
      stats.hidden = false;
      stats.innerHTML = [
        ['score', snapshot.score],
        ['distance', metres(snapshot.distance)],
        ['sparks', snapshot.sparks],
        /** Bolts only earn a column on a run that broke one. */
        ...(snapshot.bolts > 0 ? [['bolts', snapshot.bolts]] : []),
        ['best', best],
      ].map(([label, value]) => stat(label, value)).join('');
      play.textContent = 'again';
    },

    running() {
      overlay.hidden = true;
      overlay.dataset.state = 'running';
    },

    onPlay(fn) {
      play.addEventListener('click', (event) => {
        event.stopPropagation();
        fn();
      });
    },
  };
}
