import '../design-system/index.css';
import '../tools/dice-roller/dice-roller.css';
import { wireShell } from '../lib/shell.js';
import { mountDiceRoller } from '../tools/dice-roller/dice-roller.js';
import { trackEvent } from '../lib/analytics.js';
import { registerShortcut } from '../lib/shortcuts.js';
import { bootPage } from '../lib/boot.js';
import { mountAd } from '../lib/ads.js';

wireShell({ activePage: 'dice' });

const root = document.querySelector<HTMLElement>('[data-dice-roller]')!;
const tool = mountDiceRoller(root);

// Add ad below tool
const adSlot = document.createElement('div');
root.after(adSlot);
mountAd(adSlot, { slot: '3355896468', format: 'leaderboard' });

void bootPage(async () => {
  await tool.generate();
  trackEvent('roll_dice', { tool: 'dice-roller', trigger: 'pageload' });
});

registerShortcut('Primary', () => {
  void tool.generate();
  trackEvent('roll_dice', { tool: 'dice-roller', trigger: 'keyboard' });
});
