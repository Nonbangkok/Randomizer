let toastEl: HTMLDivElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

export function showToast(message: string, duration = 1800): void {
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
  hideTimer = setTimeout(() => toastEl?.classList.remove('is-visible'), duration);
}
