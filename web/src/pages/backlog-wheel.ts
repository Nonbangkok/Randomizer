import '../design-system/index.css';
import '../tools/backlog-wheel/backlog-wheel.css';
import { wireShell } from '../lib/shell.js';
import { mountBacklogWheel } from '../tools/backlog-wheel/backlog-wheel.js';
import { registerShortcut } from '../lib/shortcuts.js';

wireShell({ activePage: 'backlog' });

const root = document.querySelector<HTMLElement>('[data-backlog-wheel]')!;
mountBacklogWheel(root);

registerShortcut('Primary', () => {
  document.querySelector<HTMLButtonElement>('[data-bw-spin]')?.click();
});
