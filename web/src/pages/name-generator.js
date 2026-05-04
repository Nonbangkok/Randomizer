import '../design-system/index.css';
import { wireShell, loadWasm } from '../lib/shell.js';
import { mountNameGenerator, setGenerator } from '../tools/name-generator/name-generator.js';
import { trackEvent } from '../lib/analytics.js';

wireShell({ activePage: 'names' });

const root = document.querySelector('[data-name-generator]');

(async () => {
  try {
    const { generate_names } = await loadWasm();
    setGenerator(generate_names);
    const tool = mountNameGenerator(root);
    tool.generate();

    // Reveal main content and hide loader
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';

    trackEvent('generate_name', { tool: 'name-generator', trigger: 'pageload' });

    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) return;
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        tool.generate();
        trackEvent('generate_name', { tool: 'name-generator', trigger: 'keyboard' });
      }
    });
  } catch (err) {
    console.error('Generator failed to load', err);
    root.innerHTML = `<p>Failed to load generator. Please refresh the page.</p>`;
  }
})();
