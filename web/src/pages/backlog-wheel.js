import '../design-system/index.css';
import { wireShell } from '../lib/shell.js';
import { mountBacklogWheel } from '../tools/backlog-wheel/backlog-wheel.js';

wireShell({ activePage: 'backlog' });

const root = document.querySelector('[data-backlog-wheel]');
mountBacklogWheel(root);

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  if (e.code === 'Space' || e.key === 'Enter') {
    e.preventDefault();
    document.querySelector('[data-bw-spin]')?.click();
  }
});
