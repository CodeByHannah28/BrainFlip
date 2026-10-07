import { getState, setState } from '../state.js';
import { goTo } from '../nav.js';

const QUICK_TOPICS = [
  { id: 18, label: 'Computers' },
  { id: 19, label: 'Mathematics' },
  { id: 9, label: 'General Knowledge' },
  { id: 17, label: 'Science & Nature' },
  { id: 23, label: 'History' },
];

const STYLESHEET_ID = 'results-styles';

const ICONS = {
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  check:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  cross:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  clock:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  trophy:
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M9 20h6M10 17h4"/></svg>',
  eye: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  retake:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>',
  deck: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="3" width="13" height="13" rx="3"/><path d="M16 20H6a3 3 0 0 1-3-3V8"/></svg>',
};

function ensureStyles() {
  if (document.getElementById(STYLESHEET_ID)) return;
  const link = document.createElement('link');
  link.id = STYLESHEET_ID;
  link.rel = 'stylesheet';
  link.href = new URL('../../css/screens/results.css', import.meta.url).href;
  document.head.appendChild(link);
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  );
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function getSummary() {
  const { topic, questions, score, timeUsedSeconds, finished } = getState();
  const total = questions.length;
  if (!finished || total === 0) return null;

  const correct = score;
  const wrong = total - correct;
  const percent = Math.round((correct / total) * 100);

  return { topic, total, correct, wrong, percent, timeUsedSeconds: timeUsedSeconds || 0 };
}

function getFeedback(percent) {
  if (percent >= 80) {
    return {
      title: 'Great job!',
      text: `You scored ${percent}%. Keep going, you're making progress!`,
    };
  }
  if (percent >= 50) {
    return {
      title: 'Good effort!',
      text: `You scored ${percent}%. A little more practice and you'll get there.`,
    };
  }
  return {
    title: 'Keep practicing!',
    text: `You scored ${percent}%. Review the questions you missed and try again.`,
  };
}

function startQuiz(topic) {
  setState({ autoStartTopic: { id: topic.id, label: topic.label } });
  goTo('quiz');
}

function renderEmpty(root) {
  root.innerHTML = `
    <section class="results results-empty">
      <h1>Quiz Results</h1>
      <p>You have no results yet. Take a quiz to see how you did.</p>
      <button class="btn btn--primary" id="results-start" type="button">Start a quiz</button>
    </section>
  `;
  root.querySelector('#results-start').addEventListener('click', () => goTo('quiz'));
}

export function render(root) {
  ensureStyles();

  const summary = getSummary();
  if (!summary) {
    renderEmpty(root);
    return;
  }

  const { topic, correct, wrong, percent, timeUsedSeconds } = summary;
  const feedback = getFeedback(percent);

  const chips = [...QUICK_TOPICS];
  if (topic && !chips.some((chip) => chip.id === Number(topic.id))) {
    chips.unshift({ id: Number(topic.id), label: topic.label });
  }

  const chipsMarkup = chips
    .map(
      (chip) => `
        <li>
          <button
            class="results-chip"
            type="button"
            data-id="${chip.id}"
            data-label="${escapeHtml(chip.label)}"
            aria-pressed="${topic && Number(topic.id) === chip.id ? 'true' : 'false'}"
          >${escapeHtml(chip.label)}</button>
        </li>
      `,
    )
    .join('');

  root.innerHTML = `
    <section class="results">
      <header class="results-header">
        <button class="results-back" id="results-back" type="button" aria-label="Back to home">
          ${ICONS.back}
        </button>
        <div>
          <h1>Quiz Results</h1>
          <p class="results-subtitle">${feedback.title} Here's how you did.</p>
        </div>
      </header>

      <div class="results-summary card">
        <div class="results-ring" role="img" aria-label="Your score: ${percent} percent">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle class="results-ring-track" cx="60" cy="60" r="52" pathLength="100"></circle>
            <circle
              class="results-ring-fill${percent === 0 ? ' results-ring-fill--empty' : ''}"
              id="results-ring-fill"
              cx="60" cy="60" r="52"
              pathLength="100"
              stroke-dasharray="0 100"
            ></circle>
          </svg>
          <div class="results-ring-label">
            <strong>${percent}%</strong>
            <span>Your Score</span>
          </div>
        </div>

        <div class="results-stats">
          <div class="results-stat results-stat--correct">
            <span class="results-stat-icon">${ICONS.check}</span>
            <div>
              <strong class="results-stat-value">${correct}</strong>
              <span class="results-stat-label">Correct</span>
            </div>
          </div>
          <div class="results-stat results-stat--wrong">
            <span class="results-stat-icon">${ICONS.cross}</span>
            <div>
              <strong class="results-stat-value">${wrong}</strong>
              <span class="results-stat-label">Wrong</span>
            </div>
          </div>
          <div class="results-stat results-stat--time">
            <span class="results-stat-icon">${ICONS.clock}</span>
            <div>
              <strong class="results-stat-value">${formatTime(timeUsedSeconds)}</strong>
              <span class="results-stat-label">Time Used</span>
            </div>
          </div>
        </div>

        <div class="results-message">
          <span class="results-message-icon">${ICONS.trophy}</span>
          <div>
            <strong>${feedback.title}</strong>
            <p>${feedback.text}</p>
          </div>
        </div>
      </div>

      <div class="results-actions">
        <button class="btn btn--primary" id="results-view" type="button">
          ${ICONS.eye} View Questions
        </button>
        <button class="btn btn--outline" id="results-retake" type="button">
          ${ICONS.retake} Retake Quiz
        </button>
      </div>

      <section class="results-switch card" aria-labelledby="results-switch-title">
        <div class="results-switch-head">
          <span class="results-switch-icon">${ICONS.deck}</span>
          <div>
            <h2 class="results-switch-title" id="results-switch-title">Switch Deck</h2>
            <p class="results-switch-sub">Try a different topic and keep learning.</p>
          </div>
        </div>
        <ul class="results-chips">${chipsMarkup}</ul>
      </section>
    </section>
  `;

  const ringFill = root.querySelector('#results-ring-fill');
  requestAnimationFrame(() => {
    ringFill.setAttribute('stroke-dasharray', `${percent} 100`);
  });

  root.querySelector('#results-back').addEventListener('click', () => goTo('home'));
  root.querySelector('#results-view').addEventListener('click', () => goTo('review'));
  root.querySelector('#results-retake').addEventListener('click', () => {
    if (topic) startQuiz(topic);
    else goTo('quiz');
  });
  root.querySelectorAll('.results-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      startQuiz({ id: Number(chip.dataset.id), label: chip.dataset.label });
    });
  });
}