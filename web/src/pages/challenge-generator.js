import '../design-system/index.css';
import { wireShell, loadWasm } from '../lib/shell.js';
import { mountChallengeGenerator, setGenerator } from '../tools/challenge-generator/challenge-generator.js';

wireShell();

const root = document.querySelector('[data-challenge-generator]');

(async () => {
  try {
    const { generate_challenge } = await loadWasm();
    setGenerator(generate_challenge);
    const tool = mountChallengeGenerator(root);
    tool.generate();

    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) return;
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        tool.generate();
      }
    });
  } catch (err) {
    console.error('Generator failed to load', err);
    root.innerHTML = `<p>Failed to load. Please refresh.</p>`;
  }
})();
