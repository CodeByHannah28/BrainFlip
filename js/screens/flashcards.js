import { getCategories, loadCards } from '../api.js';
import { MESSAGES } from '../config.js';
import { getState, setState, resetFlashcards } from '../state.js';
import { saveFlashcardResult } from '../database.js';
import { escapeHtml, showLoading, showError } from '../helpers.js';
import { ICONS } from '../icons.js';
import { TOPICS } from '../../data/topics.js';

export function render(root) {
  let active = true;
  let categories = [];
  let flipped = false;
  let showAll = false;

  function getTopicLabel(category) {
    for (let i = 0; i < TOPICS.length; i++) {
      if (TOPICS[i].id === category.id) {
        return TOPICS[i].label;
      }
    }
    return category.name;
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

  function isMainTopic(id) {
    for (let i = 0; i < TOPICS.length; i++) {
      if (TOPICS[i].id === id) {
        return true;
      }
    }
    return false;
  }

  function getVisibleCategories() {
    const main = getMainCategories();
    const others = [];
    for (let i = 0; i < categories.length; i++) {
      if (!isMainTopic(categories[i].id)) {
        others.push(categories[i]);
      }
    }

    if (main.length === 0) {
      return { visible: categories, hiddenCount: 0 };
    }
    if (showAll) {
      return { visible: main.concat(others), hiddenCount: others.length };
    }

    const selectedId = getState().selectedCategory.id;
    let visible = main;
    for (let i = 0; i < others.length; i++) {
      if (others[i].id === selectedId) {
        visible = main.concat([others[i]]);
      }
    }
    return { visible: visible, hiddenCount: others.length };
  }

  async function start() {
    showLoading(root, MESSAGES.loadingTopics);
    try {
      categories = await getCategories();
    } catch (error) {
      if (active) {
        showError(root, 'Could not load topics', MESSAGES.topicsError, start);
      }
      return;
    }
    if (!active) {
      return;
    }
    if (categories.length === 0) {
      showError(root, 'No topics found', MESSAGES.topicsError, start);
      return;
    }

    if (!getState().selectedCategory) {
      const main = getMainCategories();
      let first = categories[0];
      if (main.length > 0) {
        first = main[0];
      }
      setState({ selectedCategory: { id: first.id, name: first.name } });
    }

    const state = getState();
    if (state.flashCategoryId === state.selectedCategory.id && state.flashTotal > 0) {
      drawPage();
      drawBody();
    } else {
      loadDeck();
    }
  }

  async function loadDeck() {
    const state = getState();
    drawPage();
    const body = root.querySelector('#flash-body');
    showLoading(body, 'Getting your flashcards...');

    try {
      const cards = await loadCards(state.selectedCategory.id, state.amount, state.difficulty);
      if (!active) {
        return;
      }
      flipped = false;
      setState({
        flashCategoryId: state.selectedCategory.id,
        flashQueue: cards,
        flashKnown: [],
        flashTotal: cards.length,
        flashAgain: 0,
      });
      drawBody();
    } catch (error) {
      if (active) {
        showError(body, 'Could not load flashcards', error.message, loadDeck);
      }
    }
  }

  function drawPage() {
    root.innerHTML = `
      <section class="flash">
        <div class="flash-head">
          <div class="flash-head-text">
            <h1 class="flash-title">Flashcards</h1>
            <p class="flash-subtitle">Study smarter. Remember longer.</p>
          </div>
          <div class="flash-progress" id="flash-progress"></div>
        </div>
        <div class="flash-chips" id="flash-chips"></div>
        <div id="flash-body"></div>
      </section>
    `;

    drawChips();
    drawProgress();
  }

  function drawChips() {
    const state = getState();
    const result = getVisibleCategories();
    let chipsHtml = '';

    for (let i = 0; i < result.visible.length; i++) {
      const category = result.visible[i];
      const selected = category.id === state.selectedCategory.id;
      let className = 'chip';
      if (selected) {
        className = 'chip chip--active';
      }
      chipsHtml += `<button class="${className}" type="button" data-id="${category.id}" data-name="${escapeHtml(category.name)}" aria-pressed="${selected}">${escapeHtml(getTopicLabel(category))}</button>`;
    }

    if (result.hiddenCount > 0) {
      let moreLabel = '+ ' + result.hiddenCount + ' more';
      if (showAll) {
        moreLabel = 'Show fewer';
      }
      chipsHtml += `<button class="chip chip--more" id="flash-more" type="button" aria-expanded="${showAll}">${moreLabel}</button>`;
    }

    const box = root.querySelector('#flash-chips');
    box.innerHTML = chipsHtml;

    const chips = box.querySelectorAll('.chip[data-id]');
    for (let i = 0; i < chips.length; i++) {
      chips[i].addEventListener('click', handleChipClick);
    }
    const moreButton = box.querySelector('#flash-more');
    if (moreButton) {
      moreButton.addEventListener('click', handleMoreClick);
    }
  }

  function drawProgress() {
    const state = getState();
    let percent = 0;
    if (state.flashTotal > 0) {
      percent = Math.round((state.flashKnown.length / state.flashTotal) * 100);
    }

    root.querySelector('#flash-progress').innerHTML = `
      <span class="flash-progress-icon">${ICONS.deck}</span>
      <div class="flash-progress-text">
        <strong>Deck Progress</strong>
        <span>${state.flashKnown.length} / ${state.flashTotal} cards</span>
      </div>
      <div class="flash-bar">
        <div class="flash-bar-fill" style="width: ${percent}%"></div>
      </div>
    `;
  }

  function handleChipClick(event) {
    const button = event.currentTarget;
    setState({ selectedCategory: { id: Number(button.dataset.id), name: button.dataset.name } });
    resetFlashcards();
    loadDeck();
  }

  function handleMoreClick() {
    showAll = !showAll;
    drawChips();
    const moreButton = root.querySelector('#flash-more');
    if (moreButton) {
      moreButton.focus();
    }
  }

  function drawBody() {
    const state = getState();
    const body = root.querySelector('#flash-body');
    drawProgress();

    if (state.flashQueue.length === 0) {
      body.innerHTML = `
        <div class="flash-done">
          <h2>Deck complete</h2>
          <p>You got all ${state.flashTotal} cards.</p>
          <p>You chose Review again ${state.flashAgain} times.</p>
          <button class="btn btn--primary" id="study-again" type="button">Study new cards</button>
        </div>
      `;
      body.querySelector('#study-again').addEventListener('click', function () {
        resetFlashcards();
        loadDeck();
      });
      return;
    }

    const card = state.flashQueue[0];
    let flippedClass = '';
    if (flipped) {
      flippedClass = 'flipped';
    }
    let longClass = '';
    if (card.term.length > 60) {
      longClass = ' flip-text--long';
    }
    let answerLongClass = '';
    if (card.definition.length > 60) {
      answerLongClass = ' flip-answer--long';
    }

    body.innerHTML = `
      <div class="flash-stage">
        <div class="flip-scene">
          <div class="flip-card ${flippedClass}" id="flip-card" role="button" tabindex="0">
            <div class="flip-face flip-front">
              <span class="flip-label">${escapeHtml(getTopicLabel(state.selectedCategory))}</span>
              <span class="flip-text${longClass}">${escapeHtml(card.term)}</span>
              <span class="flip-line"></span>
              <span class="flip-hint">Tap the card to see the answer</span>
            </div>
            <div class="flip-face flip-back">
              <span class="flip-answer${answerLongClass}">${escapeHtml(card.definition)}</span>
            </div>
          </div>
        </div>
        <button class="flash-arrow flash-prev" id="prev-card" type="button" aria-label="Previous card">
          ${ICONS.arrowLeft}
        </button>
        <button class="flash-arrow flash-next" id="next-card" type="button" aria-label="Next card">
          ${ICONS.arrowRight}
        </button>
      </div>
      <div class="flash-actions">
        <button class="btn btn--outline" id="review-again" type="button">
          ${ICONS.refresh} Review again
        </button>
        <button class="btn btn--primary" id="got-it" type="button">
          ${ICONS.check} Got it
        </button>
      </div>
    `;

    body.querySelector('#flip-card').addEventListener('click', flipCard);
    body.querySelector('#flip-card').addEventListener('keydown', handleCardKey);
    body.querySelector('#prev-card').addEventListener('click', previousCard);
    body.querySelector('#next-card').addEventListener('click', nextCard);
    body.querySelector('#review-again').addEventListener('click', reviewAgain);
    body.querySelector('#got-it').addEventListener('click', gotIt);
  }

  function flipCard() {
    flipped = !flipped;
    root.querySelector('#flip-card').classList.toggle('flipped');
  }

  function handleCardKey(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      flipCard();
    }
  }

  function nextCard() {
    const queue = getState().flashQueue.slice();
    queue.push(queue.shift());
    setState({ flashQueue: queue });
    flipped = false;
    drawBody();
  }

  function previousCard() {
    const queue = getState().flashQueue.slice();
    queue.unshift(queue.pop());
    setState({ flashQueue: queue });
    flipped = false;
    drawBody();
  }

  function reviewAgain() {
    const state = getState();
    const queue = state.flashQueue.slice();
    queue.push(queue.shift());
    setState({ flashQueue: queue, flashAgain: state.flashAgain + 1 });
    saveFlashcardResult(state.selectedCategory, 'reviewAgain').catch(function () {});
    flipped = false;
    drawBody();
  }

  function gotIt() {
    const state = getState();
    const queue = state.flashQueue.slice();
    const known = state.flashKnown.slice();
    known.push(queue.shift());
    setState({ flashQueue: queue, flashKnown: known });
    saveFlashcardResult(state.selectedCategory, 'gotIt').catch(function () {});
    flipped = false;
    drawBody();
  }

  start();

  return function () {
    active = false;
  };
}