import { getCategories, getCategoryCounts } from '../api.js';
import { MESSAGES } from '../config.js';
import { setState, resetQuiz, resetFlashcards } from '../state.js';
import { goTo } from '../nav.js';
import { escapeHtml, showLoading, showError } from '../helpers.js';
import { ICONS } from '../icons.js';

function getGroup(name) {
  const parts = name.split(':');
  if (parts.length > 1) {
    return parts[0].trim();
  }
  return 'Other';
}

export function render(root) {
  let active = true;
  let categories = [];
  let counts = {};
  let selectedGroup = 'All';

  root.innerHTML = `
    <section class="decks">
      <p class="decks-eyebrow">Choose your deck</p>
      <h1 class="decks-title">Pick a subject to get started</h1>
      <p class="decks-subtitle">Select a deck to start a quiz or study flashcards for that topic.</p>
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

  function getGroups() {
    const groups = ['All'];
    for (let i = 0; i < categories.length; i++) {
      const group = getGroup(categories[i].name);
      if (!groups.includes(group)) {
        groups.push(group);
      }
    }
    return groups;
  }

  function showDecks() {
    const groups = getGroups();

    let chipsHtml = '';
    for (let i = 0; i < groups.length; i++) {
      let className = 'chip';
      if (groups[i] === selectedGroup) {
        className = 'chip chip--active';
      }
      chipsHtml += `<button class="${className}" type="button" data-group="${escapeHtml(groups[i])}">${escapeHtml(groups[i])}</button>`;
    }

    let cardsHtml = '';
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      const group = getGroup(category.name);
      if (selectedGroup !== 'All' && group !== selectedGroup) {
        continue;
      }

      let countText = '';
      if (typeof counts[category.id] === 'number') {
        countText = counts[category.id] + ' questions available';
      }

      cardsHtml += `
        <article class="deck-card tint-${i % 5}">
          <span class="deck-icon">${ICONS.deck}</span>
          <div>
            <h2 class="deck-name">${escapeHtml(category.name)}</h2>
            <p class="deck-group">${escapeHtml(group)}</p>
            <p class="deck-count">${countText}</p>
          </div>
          <div class="deck-actions">
            <button class="btn btn--primary" type="button" data-action="quiz" data-id="${category.id}">Quiz</button>
            <button class="btn btn--outline" type="button" data-action="cards" data-id="${category.id}">Flashcards</button>
          </div>
        </article>
      `;
    }

    content.innerHTML = `
      <div class="chip-row">${chipsHtml}</div>
      <div class="deck-grid">${cardsHtml}</div>
    `;

    const chips = content.querySelectorAll('.chip');
    for (let i = 0; i < chips.length; i++) {
      chips[i].addEventListener('click', handleChipClick);
    }

    const buttons = content.querySelectorAll('.deck-actions button');
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', handleDeckClick);
    }
  }

  function handleChipClick(event) {
    selectedGroup = event.currentTarget.dataset.group;
    showDecks();
  }

  function handleDeckClick(event) {
    const id = Number(event.currentTarget.dataset.id);
    const action = event.currentTarget.dataset.action;

    for (let i = 0; i < categories.length; i++) {
      if (categories[i].id === id) {
        setState({ selectedCategory: { id: id, name: categories[i].name } });
      }
    }

    if (action === 'quiz') {
      resetQuiz();
      goTo('quiz');
    } else {
      resetFlashcards();
      goTo('flashcards');
    }
  }

  loadDecks();

  return function () {
    active = false;
  };
}
