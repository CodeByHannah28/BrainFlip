import { getCategories, loadCards } from '../api.js';
import { MESSAGES } from '../config.js';
import { getState, setState, resetFlashcards } from '../state.js';
import { saveFlashcardResult } from '../database.js';
import { escapeHtml, showLoading, showError } from '../helpers.js';
import { ICONS } from '../icons.js';

export function render(root) {
  let active = true;
  let categories = [];
  let flipped = false;

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

    if (!getState().selectedCategory) {
      setState({ selectedCategory: { id: categories[0].id, name: categories[0].name } });
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
    const state = getState();

    let chipsHtml = '';
    for (let i = 0; i < categories.length; i++) {
      let className = 'chip';
      if (categories[i].id === state.selectedCategory.id) {
        className = 'chip chip--active';
      }
      chipsHtml += `<button class="${className}" type="button" data-id="${categories[i].id}" data-name="${escapeHtml(categories[i].name)}">${escapeHtml(categories[i].name)}</button>`;
    }

    root.innerHTML = `
      <section class="flash">
        <div class="flash-head">
          <div class="flash-head-text">
            <h1 class="flash-title">Flashcards</h1>
            <p class="flash-subtitle">Study smarter. Remember longer.</p>
          </div>
          <div class="flash-progress" id="flash-progress"></div>
        </div>
        <div class="flash-chips" id="flash-chips">${chipsHtml}</div>
        <div id="flash-body"></div>
      </section>
    `;

    const chips = root.querySelectorAll('#flash-chips .chip');
    for (let i = 0; i < chips.length; i++) {
      chips[i].addEventListener('click', handleChipClick);
    }
    drawProgress();
  }

  function drawProgress() {
    const state = getState();
    let percent = 0;
    if (state.flashTotal > 0) {
      percent = Math.round((state.flashKnown.length / state.flashTotal) * 100);
    }

    root.querySelector('#flash-progress').innerHTML = `
      <div>
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
      flippedClass = 'is-flipped';
    }

    body.innerHTML = `
      <div class="flash-stage">
        <button class="flip-card ${flippedClass}" id="flip-card" type="button">
          <span class="flip-card-inner">
            <span class="flip-face flip-front">
              <span class="flip-label">${escapeHtml(state.selectedCategory.name)}</span>
              <span class="flip-text">${escapeHtml(card.term)}</span>
              <span class="flip-hint">Tap the card to see the answer</span>
            </span>
            <span class="flip-face flip-back">
              <span class="flip-label">Answer</span>
              <span class="flip-text">${escapeHtml(card.definition)}</span>
              <span class="flip-hint">Tap the card to flip back</span>
            </span>
          </span>
        </button>
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
    body.querySelector('#prev-card').addEventListener('click', previousCard);
    body.querySelector('#next-card').addEventListener('click', nextCard);
    body.querySelector('#review-again').addEventListener('click', reviewAgain);
    body.querySelector('#got-it').addEventListener('click', gotIt);
  }

  function flipCard() {
    flipped = !flipped;
    root.querySelector('#flip-card').classList.toggle('is-flipped');
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
