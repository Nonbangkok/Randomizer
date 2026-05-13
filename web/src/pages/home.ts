import '../design-system/index.css';
import { wireShell } from '../lib/shell.js';
import { mountAd } from '../lib/ads.js';

wireShell({ activePage: 'home' });

// Add ad after lead paragraph
const lead = document.querySelector('.lead');
if (lead) {
  const adSlot = document.createElement('div');
  lead.after(adSlot);
  mountAd(adSlot, { slot: '3355896468', format: 'leaderboard' });
}
