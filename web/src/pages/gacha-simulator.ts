import '../design-system/index.css';
import '../tools/gacha-simulator/gacha-simulator.css';
import { wireShell } from '../lib/shell.js';
import { mountGachaSimulator } from '../tools/gacha-simulator/gacha-simulator.js';
import { trackEvent } from '../lib/analytics.js';
import { registerShortcut } from '../lib/shortcuts.js';
import { bootPage } from '../lib/boot.js';
import { mountAd } from '../lib/ads.js';

wireShell({ activePage: 'gacha' });

const root = document.querySelector<HTMLElement>('[data-gacha-simulator]')!;
const tool = mountGachaSimulator(root);

// Add ad below tool
const adSlot = document.createElement('div');
root.after(adSlot);
mountAd(adSlot, { slot: '3355896468', format: 'leaderboard' });

void bootPage(async () => {
  await tool.generate();
  trackEvent('simulate_gacha', { tool: 'gacha-simulator', trigger: 'pageload' });
});

registerShortcut('Primary', () => {
  void tool.generate();
  trackEvent('simulate_gacha', { tool: 'gacha-simulator', trigger: 'keyboard' });
});
