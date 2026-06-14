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
    playerBar: el('playerhp-bar'), menaceBar: el('menace-bar'),
    toast: el('toast'), end: el('endscreen'), endTitle: el('end-title'), endText: el('end-text'),
    _t: 0,
  };
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

export function showEnd(h, won) {
  h.end.style.display = 'flex';
  h.endTitle.textContent = won ? 'VICTORY' : 'DEFEAT';
  h.endTitle.style.color = won ? '#ffd45c' : '#ff6b6b';
  h.endText.textContent = won
    ? 'The enemy Keep lies in ruins beneath the waves. The strait is yours.'
    : 'Your Keep has fallen. The salt remembers.';
}
