import '../design-system/index.css';
import { wireShell } from '../lib/shell.js';
import { mountAd, loadAdSenseScript } from '../lib/ads.js';

wireShell({ activePage: 'blog' });
loadAdSenseScript();

// Add ad to blog post if it's an article
const postHeader = document.querySelector('.blog-post__header');
if (postHeader) {
  const adSlot = document.createElement('div');
  postHeader.after(adSlot);
  mountAd(adSlot, { slot: '3355896468', format: 'leaderboard' });
}

// Add ad to blog index
const indexHeader = document.querySelector('.blog-index-header');
if (indexHeader) {
  const adSlot = document.createElement('div');
  indexHeader.after(adSlot);
  mountAd(adSlot, { slot: '3355896468', format: 'leaderboard' });
}
