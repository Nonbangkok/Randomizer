import '../design-system/index.css';
import '../tools/name-generator/name-generator.css';
import { wireShell } from '../lib/shell.js';
import { mountNameGenerator } from '../tools/name-generator/name-generator.js';
import { trackEvent } from '../lib/analytics.js';
import { registerShortcut } from '../lib/shortcuts.js';
import { bootPage } from '../lib/boot.js';

wireShell({ activePage: 'names' });

const root = document.querySelector<HTMLElement>('[data-name-generator]')!;
const tool = mountNameGenerator(root);

void bootPage(async () => {
  await tool.generate();
  trackEvent('generate_name', { tool: 'name-generator', trigger: 'pageload' });
});

registerShortcut('Primary', () => {
  void tool.generate();
  trackEvent('generate_name', { tool: 'name-generator', trigger: 'keyboard' });
});
