import '../design-system/index.css';
import { wireShell, loadWasm } from '../lib/shell.js';
import { mountNameGenerator, setGenerator } from '../tools/name-generator/name-generator.js';

wireShell();

const root = document.querySelector('[data-name-generator]');

(async () => {
  try {
    const { generate_names } = await loadWasm();
    setGenerator(generate_names);
    const tool = mountNameGenerator(root);
    tool.generate();

    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) return;
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        tool.generate();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const first = root.querySelector('[data-copy]');
        if (first) {
          e.preventDefault();
          first.click();
        }
      }
    });
  } catch (err) {
    console.error('Generator failed to load', err);
    root.innerHTML = `<p>Failed to load generator. Please refresh the page.</p>`;
  }
})();
