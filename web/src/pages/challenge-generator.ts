import '../design-system/index.css';
import '../tools/challenge-generator/challenge-generator.css';
import { wireShell } from '../lib/shell.js';
import { mountChallengeGenerator } from '../tools/challenge-generator/challenge-generator.js';
import { trackEvent } from '../lib/analytics.js';
import { registerShortcut } from '../lib/shortcuts.js';
import { bootPage } from '../lib/boot.js';
import { mountAd } from '../lib/ads.js';

wireShell({ activePage: 'challenges' });

const root = document.querySelector<HTMLElement>('[data-challenge-generator]')!;
const tool = mountChallengeGenerator(root);

// Add ad below tool
const adSlot = document.createElement('div');
root.after(adSlot);
mountAd(adSlot, { slot: '3355896468', format: 'leaderboard' });

void bootPage(async () => {
  await tool.generate();
  trackEvent('generate_challenge', { tool: 'challenge-generator', trigger: 'pageload' });
});

registerShortcut('Primary', () => { void tool.generate(); });
