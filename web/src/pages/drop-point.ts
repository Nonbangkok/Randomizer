import '../design-system/index.css';
import '../tools/drop-point/drop-point.css';
import { wireShell } from '../lib/shell.js';
import { mountDropPoint } from '../tools/drop-point/drop-point.js';
import { trackEvent } from '../lib/analytics.js';
import { registerShortcut } from '../lib/shortcuts.js';
import { bootPage } from '../lib/boot.js';
import { mountAd } from '../lib/ads.js';

wireShell({ activePage: 'drop' });

const root = document.querySelector<HTMLElement>('[data-drop-point]')!;
const tool = mountDropPoint(root);

// Add ad below tool
const adSlot = document.createElement('div');
root.after(adSlot);
mountAd(adSlot, { slot: '3355896468', format: 'leaderboard' });

void bootPage(async () => {
  await tool.generate();
  trackEvent('generate_drop_point', { tool: 'drop-point', trigger: 'pageload' });
});

registerShortcut('Primary', () => {
  void tool.generate();
  trackEvent('generate_drop_point', { tool: 'drop-point', trigger: 'keyboard' });
});
