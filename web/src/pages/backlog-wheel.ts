import '../design-system/index.css';
import '../tools/backlog-wheel/backlog-wheel.css';
import { wireShell } from '../lib/shell.js';
import { mountBacklogWheel } from '../tools/backlog-wheel/backlog-wheel.js';
import { registerShortcut } from '../lib/shortcuts.js';
import { mountAd } from '../lib/ads.js';

wireShell({ activePage: 'backlog' });

const root = document.querySelector<HTMLElement>('[data-backlog-wheel]')!;
mountBacklogWheel(root);

// Add ad below tool
const adSlot = document.createElement('div');
root.after(adSlot);
mountAd(adSlot, { slot: '3355896468', format: 'leaderboard' });

registerShortcut('Primary', () => {
  document.querySelector<HTMLButtonElement>('[data-bw-spin]')?.click();
});
