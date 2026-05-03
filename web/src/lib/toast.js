let toastEl;
let hideTimer;

export function showToast(message, duration = 1800) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => toastEl.classList.remove('is-visible'), duration);
}
