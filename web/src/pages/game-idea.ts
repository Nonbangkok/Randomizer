import '../design-system/index.css';
import '../tools/game-idea/game-idea.css';
import { wireShell } from '../lib/shell.js';
import { mountGameIdea } from '../tools/game-idea/game-idea.js';
import { trackEvent } from '../lib/analytics.js';
import { registerShortcut } from '../lib/shortcuts.js';
import { bootPage } from '../lib/boot.js';
import { mountAd } from '../lib/ads.js';

wireShell({ activePage: 'game-idea' });

const root = document.querySelector<HTMLElement>('[data-game-idea]')!;
const tool = mountGameIdea(root);

// Add ad below tool
const adSlot = document.createElement('div');
root.after(adSlot);
mountAd(adSlot, { slot: '3355896468', format: 'leaderboard' });

void bootPage(async () => {
  await tool.generate();
  trackEvent('generate_game_idea', { tool: 'game-idea', trigger: 'pageload' });
});

registerShortcut('Primary', () => {
  void tool.generate();
  trackEvent('generate_game_idea', { tool: 'game-idea', trigger: 'keyboard' });
});
