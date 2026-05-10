import '../design-system/index.css';
import '../tools/decision-maker/decision-maker.css';
import { wireShell } from '../lib/shell.js';
import { mountDecisionMaker } from '../tools/decision-maker/decision-maker.js';
import { trackEvent } from '../lib/analytics.js';
import { registerShortcut } from '../lib/shortcuts.js';
import { bootPage } from '../lib/boot.js';

wireShell({ activePage: 'decision' });

const root = document.querySelector<HTMLElement>('[data-decision-maker]')!;
const tool = mountDecisionMaker(root);

void bootPage(async () => {
  await tool.generate();
  trackEvent('generate_decision', { tool: 'decision-maker', trigger: 'pageload' });
});

registerShortcut('Primary', () => {
  void tool.generate();
  trackEvent('generate_decision', { tool: 'decision-maker', trigger: 'keyboard' });
});
