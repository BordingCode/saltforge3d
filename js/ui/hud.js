// HUD wiring: resources, selected tool, Keep health bars, menace, toasts, end screen.
import { TOOL } from '../game/state.js';

const TOOL_INFO = {
  [TOOL.MINE]:   { name: '⛏ Mine',   hint: 'Left-click a block to mine it (+stone, +firesalt deep down)' },
  [TOOL.BUILD]:  { name: '🧱 Build',  hint: 'Left-click to place a wall block (costs 1 stone)' },
  [TOOL.SCOUT]:  { name: '🔭 Scout',  hint: 'Look at the fog and left-click to scout the enemy island' },
  [TOOL.CANNON]: { name: '💥 Cannon', hint: 'Left-click to fire (costs 1 firesalt) — gold arc = where it lands' },
};

export function initHUD() {
  const el = (id) => document.getElementById(id);
  return {
    tool: el('tool'), hint: el('hint'), stone: el('stone'), firesalt: el('firesalt'),
    hotbar: [...document.querySelectorAll('.slot')],
    enemyWrap: el('enemyhp'), enemyBar: el('enemyhp-bar'),
    enemyLabel: document.querySelector('#enemyhp .barlabel'),
    playerBar: el('playerhp-bar'), menaceBar: el('menace-bar'),
    hitmarker: el('hitmarker'),
    toast: el('toast'), end: el('endscreen'), endTitle: el('end-title'), endText: el('end-text'),
    _t: 0,
  };
}

// Player landed a shell on the enemy Keep — pop the crosshair marker and punch the HP bar.
export function hitMarker(h, keeps) {
  // crosshair marker (retrigger the CSS animation)
  if (h.hitmarker) {
    h.hitmarker.classList.remove('show');
    void h.hitmarker.offsetWidth;
    h.hitmarker.classList.add('show');
  }
  // make sure the enemy bar is visible, snap it to the new HP, and flash it
  h.enemyWrap.style.opacity = 1;
  h.enemyBar.style.width = (100 * keeps.enemyHP() / keeps.enemyMax) + '%';
  h.enemyBar.classList.remove('hit');
  void h.enemyBar.offsetWidth;
  h.enemyBar.classList.add('hit');
  if (h.enemyLabel) {
    h.enemyLabel.classList.remove('bump');
    void h.enemyLabel.offsetWidth;
    h.enemyLabel.classList.add('bump');
  }
}

export function setTool(h, tool) {
  h.tool.textContent = TOOL_INFO[tool].name;
  h.hint.textContent = TOOL_INFO[tool].hint;
  h.hotbar.forEach((s) => s.classList.toggle('active', Number(s.dataset.tool) === tool));
}

export function updateHUD(h, state, keeps, rival) {
  h.stone.textContent = state.stone;
  h.firesalt.textContent = state.firesalt;
  h.playerBar.style.width = (100 * keeps.playerHP() / keeps.playerMax) + '%';
  h.menaceBar.style.width = rival.menace + '%';
  if (state.reveal > 0.25) {
    h.enemyWrap.style.opacity = 1;
    h.enemyBar.style.width = (100 * keeps.enemyHP() / keeps.enemyMax) + '%';
  } else {
    h.enemyWrap.style.opacity = 0.25;
  }
}

export function toast(h, msg, ms = 2600) {
  h.toast.textContent = msg;
  h.toast.style.opacity = 1;
  clearTimeout(h._t);
  h._t = setTimeout(() => { h.toast.style.opacity = 0; }, ms);
}

export function showEnd(h, won, stats = {}) {
  h.end.style.display = 'flex';
  h.endTitle.textContent = won ? 'VICTORY' : 'DEFEAT';
  h.endTitle.style.color = won ? '#ffd45c' : '#ff6b6b';

  const flavour = won
    ? 'The enemy Keep lies in ruins beneath the waves. The strait is yours.'
    : 'Your Keep has fallen. The salt remembers.';

  const { destroyed = 0, enemyHP = 0, enemyMax = 1, playerHP = 0, playerMax = 1,
          firesalt = 0, shotsFired = 0, rivalFired = 0 } = stats;

  const lines = [flavour];
  lines.push(`Blocks pulverised: ${destroyed}  ·  your shells fired: ${shotsFired}`);
  lines.push(`Their Keep: ${Math.round(100 * enemyHP / enemyMax)}% standing  ·  yours: ${Math.round(100 * playerHP / playerMax)}%`);
  lines.push(`Rival shells launched at you: ${rivalFired}`);

  if (!won) {
    // one honest diagnostic cause line
    let why;
    if (firesalt <= 0 && enemyHP > 0) why = 'You ran out of firesalt with their Keep still standing — dig deeper next time.';
    else if (enemyHP > enemyMax * 0.6) why = 'Their Keep was barely scratched — close the range and walk your shells onto the gold blocks.';
    else why = 'They out-built your bombardment — repair (R) more and answer their fire faster.';
    lines.push('— ' + why);
  }

  // <p id="end-text"> holds the lines; use line breaks for honesty without extra DOM.
  h.endText.innerHTML = lines.map((l, i) =>
    i === 0 ? `<span style="opacity:.95">${l}</span>`
            : `<span style="display:block;margin-top:8px;font-size:14px;opacity:.8">${l}</span>`
  ).join('');
}
