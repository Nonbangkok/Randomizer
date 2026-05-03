import '../design-system/index.css';
import { wireShell, loadWasm } from '../lib/shell.js';
import { mountPasswordGenerator, setBackends } from '../tools/password-generator/password-generator.js';

wireShell();

const root = document.querySelector('[data-password-generator]');

(async () => {
  try {
    const { generate_password, analyze_password } = await loadWasm();
    setBackends({ generate: generate_password, analyze: analyze_password });
    const tool = mountPasswordGenerator(root);
    tool.regenerate();

    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) return;
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        tool.regenerate();
      }
    });
  } catch (err) {
    console.error('Generator failed to load', err);
    root.innerHTML = `<p>Failed to load generator. Please refresh the page.</p>`;
  }
})();
