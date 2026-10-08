import { TOPICS } from '../../data/topics.js';
import { SETTINGS } from '../config.js';
import { setState } from '../state.js';
import { goTo } from '../nav.js';

const STYLESHEET_ID = 'decks-styles';

const ICONS = {
  cards:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="3" width="13" height="13" rx="3"/><path d="M16 20H6a3 3 0 0 1-3-3V8"/></svg>',
  quiz: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  arrow:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
};

function ensureStyles() {
  if (document.getElementById(STYLESHEET_ID)) return;
  const link = document.createElement('link');
  link.id = STYLESHEET_ID;
  link.rel = 'stylesheet';
  link.href = new URL('../../css/screens/decks.css', import.meta.url).href;
  document.head.appendChild(link);
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

export function render(root) {
  ensureStyles();
  let filter = 'all';

  function renderGrid() {
    const visibleTopics = filter === 'all' ? TOPICS : TOPICS.filter((t) => t.id === Number(filter));

    const chipsMarkup = `
      <button class="decks-filter" data-id="all" aria-pressed="${filter === 'all'}">All</button>
      ${TOPICS.map(
        (t) => `
        <button class="decks-filter" data-id="${t.id}" aria-pressed="${filter === String(t.id)}">
          ${escapeHtml(t.label)}
        </button>
      `,
      ).join('')}
    `;

    const cardsMarkup = visibleTopics
      .map(
        (topic) => `
      <button class="decks-card" data-topic="${topic.id}" data-label="${escapeHtml(topic.label)}">
        <span class="decks-card-icon" style="background: ${topic.tile}; color: ${topic.color};">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${topic.path}</svg>
        </span>
        <h3 class="decks-card-title">${escapeHtml(topic.label)}</h3>
        <p class="decks-card-desc">${escapeHtml(topic.description)}</p>
        <div class="decks-card-meta">
          <span>${ICONS.cards} 10 cards</span>
          <span>${ICONS.quiz} ${SETTINGS.questionsPerQuiz} questions</span>
        </div>
        <div class="decks-card-arrow">${ICONS.arrow}</div>
      </button>
    `,
      )
      .join('');

    root.innerHTML = `
      <section class="decks">
        <header>
          <div class="decks-header-sub">Choose your deck</div>
          <h1 class="decks-header-title">Pick a subject to get started</h1>
          <p class="decks-header-desc">Select a deck to view questions and flashcards for that topic.</p>
        </header>
        
        <div class="decks-filters" role="group" aria-label="Filter topics">
          ${chipsMarkup}
        </div>

        <div class="decks-grid">
          ${cardsMarkup}
        </div>
      </section>
    `;

    root.querySelectorAll('.decks-filter').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        filter = e.currentTarget.dataset.id;
        renderGrid();
      });
    });

    root.querySelectorAll('.decks-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.topic);
        const label = e.currentTarget.dataset.label;

        // Save to state and route directly to the quiz
        setState({ autoStartTopic: { id, label } });
        goTo('quiz');
      });
    });
  }

  renderGrid();
}
