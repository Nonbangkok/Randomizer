import '../design-system/index.css';
import '../tools/password-generator/password-generator.css';
import { wireShell } from '../lib/shell.js';
import { mountPasswordGenerator } from '../tools/password-generator/password-generator.js';
import { registerShortcut } from '../lib/shortcuts.js';
import { bootPage } from '../lib/boot.js';
import { mountAd } from '../lib/ads.js';

wireShell({ activePage: 'passwords' });

const root = document.querySelector<HTMLElement>('[data-password-generator]')!;
const tool = mountPasswordGenerator(root);

// Add ad below tool
const adSlot = document.createElement('div');
root.after(adSlot);
mountAd(adSlot, { slot: '3355896468', format: 'leaderboard' });

void bootPage(() => tool.regenerate());

registerShortcut('Primary', () => { void tool.regenerate(); });
