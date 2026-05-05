import '../design-system/index.css';
import '../tools/password-generator/password-generator.css';
import { wireShell } from '../lib/shell.js';
import { mountPasswordGenerator } from '../tools/password-generator/password-generator.js';
import { registerShortcut } from '../lib/shortcuts.js';
import { bootPage } from '../lib/boot.js';

wireShell({ activePage: 'passwords' });

const root = document.querySelector<HTMLElement>('[data-password-generator]')!;
const tool = mountPasswordGenerator(root);

void bootPage(() => tool.regenerate());

registerShortcut('Primary', () => { void tool.regenerate(); });
