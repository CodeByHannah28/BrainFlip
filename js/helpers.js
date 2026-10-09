export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getLetter(index) {
  return 'ABCD'.charAt(index);
}

export function formatClock(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

export function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + 'm ' + seconds + 's';
}

export function formatDate(timestamp) {
  if (!timestamp || !timestamp.toDate) {
    return '';
  }
  return timestamp.toDate().toLocaleDateString();
}

export function showLoading(box, message) {
  box.innerHTML = `
    <div class="loading-box" role="status">
      <div class="loader"></div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

export function showError(box, title, message, onRetry) {
  box.innerHTML = `
    <div class="error-box" role="alert">
      <span class="error-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
          <path d="M12 7v6M12 17h.01" />
        </svg>
      </span>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
      <button class="btn btn--primary" id="retry-btn" type="button">Try Again</button>
    </div>
  `;
  box.querySelector('#retry-btn').addEventListener('click', onRetry);
}
