import '../design-system/index.css';
import '../tools/dice-roller/dice-roller.css';
import { wireShell } from '../lib/shell.js';
import { mountDiceRoller } from '../tools/dice-roller/dice-roller.js';
import { trackEvent } from '../lib/analytics.js';
import { registerShortcut } from '../lib/shortcuts.js';
import { bootPage } from '../lib/boot.js';

wireShell({ activePage: 'dice' });

const root = document.querySelector<HTMLElement>('[data-dice-roller]')!;
const tool = mountDiceRoller(root);

void bootPage(async () => {
  await tool.generate();
  trackEvent('roll_dice', { tool: 'dice-roller', trigger: 'pageload' });
});

registerShortcut('Primary', () => {
  void tool.generate();
  trackEvent('roll_dice', { tool: 'dice-roller', trigger: 'keyboard' });
});
