import { showToast } from './toast.js';

let enabled = false;
let lastWarning = 0;

function warn() {
  const now = Date.now();
  if (now - lastWarning < 4000) {
    return;
  }
  lastWarning = now;
  showToast(
    'Screenshots are not allowed',
    'Please do not take screenshots or copy the questions while you take a quiz or study flashcards.',
  );
}

function hideContent() {
  if (enabled) {
    document.body.classList.add('protected-blur');
  }
}

function showContent() {
  document.body.classList.remove('protected-blur');
}

function handleContextMenu(event) {
  if (enabled) {
    event.preventDefault();
  }
}

function handleCopy(event) {
  if (enabled) {
    event.preventDefault();
    warn();
  }
}

function handleDrag(event) {
  if (enabled) {
    event.preventDefault();
  }
}

function handleKeyDown(event) {
  if (!enabled) {
    return;
  }
  const key = event.key.toLowerCase();
  const ctrl = event.ctrlKey || event.metaKey;

  if (ctrl && (key === 'p' || key === 's')) {
    event.preventDefault();
    warn();
    return;
  }
  if (event.metaKey && event.shiftKey && (key === 's' || key === '3' || key === '4' || key === '5')) {
    event.preventDefault();
    warn();
  }
}

function handleKeyUp(event) {
  if (!enabled) {
    return;
  }
  if (event.key === 'PrintScreen') {
    try {
      navigator.clipboard.writeText('');
    } catch (error) {
      warn();
      return;
    }
    warn();
  }
}

function handleVisibility() {
  if (document.hidden) {
    hideContent();
  } else {
    showContent();
  }
}

document.addEventListener('contextmenu', handleContextMenu);
document.addEventListener('copy', handleCopy);
document.addEventListener('cut', handleCopy);
document.addEventListener('dragstart', handleDrag);
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
document.addEventListener('visibilitychange', handleVisibility);
window.addEventListener('blur', hideContent);
window.addEventListener('focus', showContent);

export function setProtection(on) {
  enabled = on;
  if (on) {
    document.body.classList.add('protected');
  } else {
    document.body.classList.remove('protected');
    showContent();
  }
}