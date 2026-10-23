import { getCategories, loadCards } from '../api.js';
import { MESSAGES } from '../config.js';
import { getState, setState, resetFlashcards } from '../state.js';
import { saveFlashcardResult } from '../database.js';
import { goTo } from '../nav.js';
import { escapeHtml, showLoading, showError } from '../helpers.js';
import { ICONS } from '../icons.js';
import { openTopicDialog } from '../dialog.js';
import { TOPICS, getTopicData } from '../../data/topics.js';
import { topicIconHtml } from '../topic-icon.js';

function getTopicLabel(category) {
  for (let i = 0; i < TOPICS.length; i++) {
    if (TOPICS[i].id === category.id) {
      return TOPICS[i].label;
    }
  }
  return category.name;
}

function getDifficultyLabel(value) {
  if (!value) {
    return 'Any';
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getFinishMessage(total, again) {
  if (again === 0) {
    return {
      title: 'Perfect run!',
      text: 'You knew all ' + total + ' cards without needing a second look. Brilliant work, keep that streak alive!',
    };
  }
  if (again <= Math.ceil(total / 2)) {
    return {
      title: 'Deck conquered!',
      text: 'You mastered all ' + total + ' cards. A few needed a second look, and that is exactly how knowledge sticks.',
    };
  }
  return {
    title: 'You made it through!',
    text: 'All ' + total + ' cards are done. Some took a few tries, which is how real learning happens. Another round will lock them in.',
  };
}

export function render(root) {
  let active = true;
  let categories = [];
  let flipped = false;

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

    const selectedId = getState().selectedCategory.id;
    let visible = main;
    for (let i = 0; i < others.length; i++) {
      if (others[i].id === selectedId) {
        visible = main.concat([others[i]]);
      }
    }
    return { visible: visible, hiddenCount: others.length };
  }

  function showNoTopic() {
    root.innerHTML = `
      <section class="review review-empty">
        <div class="review-empty-card">
          <span class="review-empty-icon">${ICONS.deck}</span>
          <p class="review-empty-kicker">Flashcards</p>
          <h1 class="review-empty-title">Choose a deck</h1>
          <p class="review-empty-text">
            Pick a deck first, then flip through the cards and mark the ones you know.
          </p>
          <ol class="review-empty-steps">
            <li class="review-empty-step"><strong>1</strong><span>Choose a deck</span></li>
            <li class="review-empty-step"><strong>2</strong><span>Flip the cards</span></li>
            <li class="review-empty-step"><strong>3</strong><span>Mark what you know</span></li>
          </ol>
          <div class="review-empty-actions review-empty-actions--single">
            <button class="btn btn--primary" id="choose-deck" type="button">
              ${ICONS.deck} Choose a deck
            </button>
          </div>
        </div>
      </section>
    `;
    root.querySelector('#choose-deck').addEventListener('click', function () {
      goTo('decks');
    });
  }

  function showIntro() {
    const state = getState();
    const category = state.selectedCategory;
    const data = getTopicData(category.id);

    root.innerHTML = `
      <section class="quiz-start">
        <div class="quiz-start-card">
          <span class="quiz-start-icon" style="background: ${data.tile}; color: ${data.color};">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${data.path}</svg>
          </span>
          <p class="quiz-start-kicker">Flashcards</p>
          <h1 class="quiz-start-title">${escapeHtml(getTopicLabel(category))}</h1>
          <p class="quiz-start-text">
            Read the question, flip the card to see the answer, then mark the ones you know.
          </p>
          <ul class="quiz-start-facts">
            <li class="quiz-start-fact">
              <strong>${state.amount}</strong>
              <span>Cards</span>
            </li>
            <li class="quiz-start-fact">
              <strong>${getDifficultyLabel(state.difficulty)}</strong>
              <span>Difficulty</span>
            </li>
            <li class="quiz-start-fact">
              <strong>Flip</strong>
              <span>Study style</span>
            </li>
          </ul>
          <div class="quiz-start-actions">
            <button class="btn btn--primary" id="begin-study" type="button">
              ${ICONS.play} Start Studying
            </button>
            <button class="btn btn--outline" id="change-topic" type="button">Change topic</button>
          </div>
        </div>
      </section>
    `;
    root.querySelector('#begin-study').addEventListener('click', startStudy);
    root.querySelector('#change-topic').addEventListener('click', function () {
      goTo('home');
    });
  }

  async function loadCategoryList() {
    if (categories.length > 0) {
      return true;
    }
    try {
      categories = await getCategories();
    } catch (error) {
      return false;
    }
    return categories.length > 0;
  }

  async function startStudy() {
    showLoading(root, MESSAGES.loadingTopics);
    const loaded = await loadCategoryList();
    if (!active) {
      return;
    }
    if (!loaded) {
      showError(root, 'Could not load topics', MESSAGES.topicsError, startStudy);
      return;
    }
    loadDeck();
  }

  async function resumeStudy() {
    showLoading(root, MESSAGES.loadingTopics);
    const loaded = await loadCategoryList();
    if (!active) {
      return;
    }
    if (!loaded) {
      showError(root, 'Could not load topics', MESSAGES.topicsError, resumeStudy);
      return;
    }
    drawPage();
    drawBody();
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
        <div class="flash-stats" id="flash-stats"></div>
        <div id="flash-body"></div>
      </section>
    `;

    drawChips();
    drawProgress();
    drawStats();
  }

  function drawStats() {
    const state = getState();
    const box = root.querySelector('#flash-stats');
    if (!box) {
      return;
    }
    if (state.flashTotal === 0) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = `
      <span class="flash-stat"><strong>${state.flashQueue.length}</strong> left</span>
      <span class="flash-stat flash-stat--known"><strong>${state.flashKnown.length}</strong> known</span>
      <span class="flash-stat flash-stat--again"><strong>${state.flashAgain}</strong> to review</span>
    `;
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
      chipsHtml += `<button class="${className}" type="button" data-id="${category.id}" data-name="${escapeHtml(category.name)}" aria-pressed="${selected}">${topicIconHtml(category.id, 30)}<span>${escapeHtml(getTopicLabel(category))}</span></button>`;
    }

    if (result.hiddenCount > 0) {
      chipsHtml += `<button class="chip chip--more" id="flash-more" type="button">+ ${result.hiddenCount} more</button>`;
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

  function pickCategory(category) {
    setState({ selectedCategory: { id: category.id, name: category.name } });
    resetFlashcards();
    loadDeck();
  }

  function handleChipClick(event) {
    const button = event.currentTarget;
    pickCategory({ id: Number(button.dataset.id), name: button.dataset.name });
  }

  function handleMoreClick(event) {
    openTopicDialog(
      categories,
      getState().selectedCategory.id,
      pickCategory,
      event.currentTarget,
    );
  }

  function drawBody() {
    const state = getState();
    const body = root.querySelector('#flash-body');
    drawProgress();
    drawStats();

    if (state.flashQueue.length === 0) {
      const finish = getFinishMessage(state.flashTotal, state.flashAgain);
      const topicLabel = escapeHtml(getTopicLabel(state.selectedCategory));
      body.innerHTML = `
        <div class="flash-done">
          <span class="flash-done-icon">${ICONS.trophy}</span>
          <p class="flash-done-kicker">Deck complete</p>
          <h2 class="flash-done-title">${finish.title}</h2>
          <p class="flash-done-text">${finish.text}</p>
          <ul class="flash-done-facts">
            <li class="flash-done-fact">
              <strong>${state.flashTotal}</strong>
              <span>Cards mastered</span>
            </li>
            <li class="flash-done-fact">
              <strong>${state.flashAgain}</strong>
              <span>Review again taps</span>
            </li>
          </ul>
          <h3 class="flash-done-question">What would you like to do next?</h3>
          <div class="flash-done-actions">
            <button class="btn btn--primary" id="continue-topic" type="button">
              ${ICONS.refresh} Retake ${topicLabel}
            </button>
            <button class="btn btn--outline" id="new-topic" type="button">
              ${ICONS.deck} Pick a new topic
            </button>
          </div>
        </div>
      `;
      body.querySelector('#continue-topic').addEventListener('click', function () {
        resetFlashcards();
        loadDeck();
      });
      body.querySelector('#new-topic').addEventListener('click', function () {
        goTo('decks');
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
      <div class="flash-tools">
        <button class="btn btn--outline flash-tool" id="flip-btn" type="button">
          ${ICONS.refresh} Flip card
        </button>
        <button class="btn btn--outline flash-tool" id="shuffle-btn" type="button">
          ${ICONS.deck} Shuffle
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
      <p class="flash-keys">Tip: press F to flip, and the left and right arrow keys to move.</p>
    `;

    body.querySelector('#flip-btn').addEventListener('click', flipCard);
    body.querySelector('#shuffle-btn').addEventListener('click', shuffleCards);
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

  function shuffleCards() {
    const queue = getState().flashQueue.slice();
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = queue[i];
      queue[i] = queue[j];
      queue[j] = temp;
    }
    setState({ flashQueue: queue });
    flipped = false;
    drawBody();
  }

  function handleKey(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (document.querySelector('dialog[open]')) {
      return;
    }
    if (!root.querySelector('#flip-card')) {
      return;
    }
    if (event.key === 'ArrowRight') {
      nextCard();
    } else if (event.key === 'ArrowLeft') {
      previousCard();
    } else if (event.key === 'f' || event.key === 'F') {
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

  document.addEventListener('keydown', handleKey);

  const state = getState();
  if (!state.selectedCategory) {
    showNoTopic();
  } else if (state.flashCategoryId === state.selectedCategory.id && state.flashTotal > 0) {
    resumeStudy();
  } else {
    showIntro();
  }

  return function () {
    active = false;
    document.removeEventListener('keydown', handleKey);
  };
}