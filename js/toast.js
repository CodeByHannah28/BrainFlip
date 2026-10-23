import { ICONS } from './icons.js';

export function showToast(title, message) {
  const old = document.querySelector('.toast');
  if (old) {
    old.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  toast.innerHTML = `
    <span class="toast-icon">${ICONS.clock}</span>
    <div class="toast-body">
      <strong class="toast-title"></strong>
      <p class="toast-text"></p>
    </div>
    <button class="toast-close" type="button" aria-label="Close message">${ICONS.cross}</button>
  `;
  toast.querySelector('.toast-title').textContent = title;
  toast.querySelector('.toast-text').textContent = message;

  const timer = setTimeout(close, 7000);

  function close() {
    clearTimeout(timer);
    toast.remove();
  }

  toast.querySelector('.toast-close').addEventListener('click', close);
  document.body.appendChild(toast);
}