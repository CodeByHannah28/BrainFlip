import { getCategories, getCategoryCounts } from '../api.js';
import { SETTINGS, MESSAGES } from '../config.js';
import { setState, resetQuiz, resetFlashcards } from '../state.js';
import { goTo } from '../nav.js';
import { escapeHtml, showLoading, showError } from '../helpers.js';
import { ICONS } from '../icons.js';
import { TOPICS, getTopicData } from '../../data/topics.js';

const OTHER_TINTS = [
  'var(--color-peach-bg)',
  'var(--color-blue-bg)',
  'var(--color-purple-bg)',
  'var(--color-green-bg)',
  'var(--color-yellow-bg)',
];

const CARDS_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="3" width="13" height="13" rx="3" /><path d="M16 20H6a3 3 0 0 1-3-3V8" /></svg>';

const QUESTIONS_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 0 1 5 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01" /></svg>';

function getGroup(name) {
  const parts = name.split(':');
  if (parts.length > 1) {
    return parts[0].trim();
  }
  return 'Other';
}

function getShortName(name) {
  const parts = name.split(':');
  if (parts.length > 1) {
    return parts.slice(1).join(':').trim();
  }
  return name;
}

function findTopic(id) {
  for (let i = 0; i < TOPICS.length; i++) {
    if (TOPICS[i].id === id) {
      return TOPICS[i];
    }
  }
  return null;
}

export function render(root) {
  let active = true;
  let categories = [];
  let counts = {};
  let selectedFilter = 'all';

  root.innerHTML = `
    <section class="decks">
      <header class="decks-header">
        <p class="decks-eyebrow">Choose your deck</p>
        <h1 class="decks-title">Pick a subject to get started</h1>
        <p class="decks-subtitle">Select a deck to start a quiz or study flashcards for that topic.</p>
      </header>
      <div id="decks-content"></div>
    </section>
  `;

  const content = root.querySelector('#decks-content');

  async function loadDecks() {
    showLoading(content, MESSAGES.loadingTopics);
    try {
      categories = await getCategories();
      counts = await getCategoryCounts();
    } catch (error) {
      if (active) {
        showError(content, 'Could not load topics', MESSAGES.topicsError, loadDecks);
      }
      return;
    }
    if (active) {
      showDecks();
    }
  }

  function getMainCategories() {
    const main = [];
    for (let i = 0; i < TOPICS.length; i++) {
      for (let j = 0; j < categories.length; j++) {
        if (categories[j].id === TOPICS[i].id) {
          main.push(categories[j]);
        }
      }
    }
    return main;
  }

  function getOtherCategories() {
    const others = [];
    for (let i = 0; i < categories.length; i++) {
      if (!findTopic(categories[i].id)) {
        others.push(categories[i]);
      }
    }
    return others;
  }

  function getFilters(main, others) {
    const filters = [{ key: 'all', label: 'All' }];
    for (let i = 0; i < main.length; i++) {
      filters.push({ key: String(main[i].id), label: findTopic(main[i].id).label });
    }
    if (others.length > 0) {
      filters.push({ key: 'more', label: 'More topics' });
    }
    return filters;
  }

  function getVisible(main, others) {
    if (selectedFilter === 'all') {
      return main.length > 0 ? main : categories;
    }
    if (selectedFilter === 'more') {
      return others;
    }
    return main.filter(function (category) {
      return String(category.id) === selectedFilter;
    });
  }

  function cardHtml(category, position) {
    const topic = findTopic(category.id);
    const data = getTopicData(category.id);
    const group = getGroup(category.name);

    let name = getShortName(category.name);
    let description = group === 'Other' ? 'A mix of trivia questions.' : group + ' trivia questions.';
    let tint = OTHER_TINTS[position % OTHER_TINTS.length];
    let color = 'var(--color-brand)';

    if (topic) {
      name = topic.label;
      description = topic.description;
      tint = data.tile;
      color = data.color;
    }

    let questionsHtml = '';
    if (typeof counts[category.id] === 'number') {
      questionsHtml = `<span class="deck-stat">${QUESTIONS_ICON}${counts[category.id]} questions</span>`;
    }

    return `
      <article class="deck-card" style="--deck-tint: ${tint}; --deck-color: ${color};">
        <span class="deck-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${data.path}</svg>
        </span>
        <div class="deck-body">
          <h2 class="deck-name">${escapeHtml(name)}</h2>
          <p class="deck-description">${escapeHtml(description)}</p>
        </div>
        <div class="deck-footer">
          <p class="deck-stats">
            <span class="deck-stat">${CARDS_ICON}${SETTINGS.questionsPerQuiz} cards</span>
            ${questionsHtml}
          </p>
          <div class="deck-actions">
            <button class="deck-action" type="button" data-action="cards" data-id="${category.id}" aria-label="Study ${escapeHtml(name)} flashcards" title="Study flashcards">${ICONS.deck}</button>
            <button class="deck-action deck-action--quiz" type="button" data-action="quiz" data-id="${category.id}" aria-label="Start ${escapeHtml(name)} quiz" title="Start quiz">${ICONS.arrowRight}</button>
          </div>
        </div>
      </article>
    `;
  }

  function showDecks() {
    const main = getMainCategories();
    const others = getOtherCategories();
    const filters = getFilters(main, others);
    const visible = getVisible(main, others);

    let chipsHtml = '';
    for (let i = 0; i < filters.length; i++) {
      let className = 'chip';
      if (filters[i].key === selectedFilter) {
        className = 'chip chip--active';
      }
      chipsHtml += `<button class="${className}" type="button" data-filter="${filters[i].key}">${escapeHtml(filters[i].label)}</button>`;
    }

    let cardsHtml = '';
    for (let i = 0; i < visible.length; i++) {
      cardsHtml += cardHtml(visible[i], i);
    }

    content.innerHTML = `
      <div class="chip-row decks-chips">${chipsHtml}</div>
      <div class="deck-grid">${cardsHtml}</div>
    `;
  }

  function handleClick(event) {
    const chip = event.target.closest('[data-filter]');
    if (chip) {
      selectedFilter = chip.dataset.filter;
      showDecks();
      return;
    }

    const button = event.target.closest('[data-action]');
    if (!button) {
      return;
    }

    const id = Number(button.dataset.id);
    for (let i = 0; i < categories.length; i++) {
      if (categories[i].id === id) {
        setState({ selectedCategory: { id: id, name: categories[i].name } });
      }
    }

    if (button.dataset.action === 'quiz') {
      resetQuiz();
      goTo('quiz');
    } else {
      resetFlashcards();
      goTo('flashcards');
    }
  }

  content.addEventListener('click', handleClick);
  loadDecks();

  return function () {
    active = false;
  };
}