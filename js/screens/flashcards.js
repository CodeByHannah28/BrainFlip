import { fetchCategories, loadQuestions } from '../api.js';
import { getState, setState, markCardKnown } from '../state.js';
import { TOPICS } from '../../data/topics.js';

const TOPIC_COUNT = 5;
const CARDS_PER_DECK = 10;
const RETRY_WAIT_MS = 5500;
const STYLESHEET_ID = 'flashcards-styles';
const LOADING_TEXT = 'Getting your flashcards...';
const ERROR_TEXT =
  'Could not load flashcards. Please check your internet connection and try again.';
const LONG_TEXT_LENGTH = 90;

const deckCache = new Map();
let topicCache = null;

const ICONS = {
  prev: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
  next: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  again:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>',
  check:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  deck: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="3" width="13" height="13" rx="3"/><path d="M16 20H6a3 3 0 0 1-3-3V8"/></svg>',
  cap: '<svg class="flashcards-cap" aria-hidden="true"><use href="#icon-cap" /></svg>',
};

function ensureStyles() {
  if (document.getElementById(STYLESHEET_ID)) return;
  const link = document.createElement('link');
  link.id = STYLESHEET_ID;
  link.rel = 'stylesheet';
  link.href = new URL('../../css/screens/flashcards.css', import.meta.url).href;
  document.head.appendChild(link);
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function cleanLabel(name) {
  return name.replace(/^(Science|Entertainment):\s*/, '');
}

function pickTopics(categories) {
  const preferredIds = TOPICS.map((t) => t.id);
  const preferred = preferredIds.map((id) => categories.find((c) => c.id === id)).filter(Boolean);
  const others = categories.filter((category) => !preferred.includes(category));
  return [...preferred, ...others]
    .slice(0, TOPIC_COUNT)
    .map((category) => ({ id: category.id, label: cleanLabel(category.name) }));
}

async function fetchDeck(topicId) {
  if (deckCache.has(topicId)) return deckCache.get(topicId);

  let questions;
  try {
    questions = await loadQuestions(topicId, CARDS_PER_DECK);
  } catch (error) {
    if (!String(error.message).includes('response code: 5')) throw error;
    await wait(RETRY_WAIT_MS);
    questions = await loadQuestions(topicId, CARDS_PER_DECK);
  }

  const cards = questions.map((question) => ({
    id: question.id,
    topic: String(topicId),
    term: question.question,
    definition: question.options[question.correctIndex],
  }));
  deckCache.set(topicId, cards);
  return cards;
}

export function render(root) {
  ensureStyles();

  root.innerHTML = '<section class="flashcards" aria-label="Flashcards"></section>';
  const screen = root.firstElementChild;

  let active = true;
  let topics = [];
  let activeTopicId = null;
  let status = 'loading';
  let message = LOADING_TEXT;
  let deck = [];
  let queue = [];
  let index = 0;
  let flipped = false;

  function getStartTopicId() {
    const saved = getState().topic;
    const savedId = saved ? Number(saved.id) : NaN;
    if (!Number.isInteger(savedId)) return topics[0].id;
    if (!topics.some((topic) => topic.id === savedId)) {
      topics = [{ id: savedId, label: cleanLabel(saved.label) }, ...topics].slice(0, TOPIC_COUNT);
    }
    return savedId;
  }

  function topicLabel() {
    const topic = topics.find((item) => item.id === activeTopicId);
    return topic ? topic.label : '';
  }

  function knownCount() {
    const { knownCards } = getState();
    return deck.filter((card) => knownCards.includes(card.id)).length;
  }

  function progressHtml() {
    const known = knownCount();
    const total = deck.length;
    const percent = total === 0 ? 0 : Math.round((known / total) * 100);
    return `
      <div class="flashcards-progress">
        <span class="flashcards-progress-icon">${ICONS.deck}</span>
        <div class="flashcards-progress-body">
          <p class="flashcards-progress-title">Deck Progress</p>
          <p class="flashcards-progress-count">${known} / ${total} cards</p>
          <div class="flashcards-bar" role="progressbar" aria-label="Deck progress"
            aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
            <div class="flashcards-bar-fill" style="width: ${percent}%"></div>
          </div>
        </div>
      </div>
    `;
  }

  function chipsHtml() {
    return topics
      .map(
        (topic) => `
          <button class="flashcards-chip" type="button" data-topic="${topic.id}"
            aria-pressed="${topic.id === activeTopicId}" ${status === 'loading' ? 'disabled' : ''}>
            ${escapeHtml(topic.label)}
          </button>
        `,
      )
      .join('');
  }

  function viewerHtml() {
    if (status === 'loading') {
      return `
        <div class="card flashcards-message">
          <p role="status">${escapeHtml(message)}</p>
        </div>
      `;
    }

    if (status === 'error') {
      return `
        <div class="card flashcards-message">
          <h2>Something went wrong</h2>
          <p role="status">${escapeHtml(message)}</p>
          <button class="btn btn--primary" type="button" data-action="retry">Try again</button>
        </div>
      `;
    }

    if (queue.length === 0) {
      return `
        <div class="card flashcards-message">
          <h2>Deck complete!</h2>
          <p>You know all ${deck.length} cards in ${escapeHtml(topicLabel())}.</p>
          <button class="btn btn--primary" type="button" data-action="restart">Study again</button>
        </div>
      `;
    }

    const card = queue[index];
    const termClass = card.term.length > LONG_TEXT_LENGTH ? 'is-long' : '';
    const definitionClass = card.definition.length > LONG_TEXT_LENGTH ? 'is-long' : '';
    return `
      <div class="flashcards-viewer">
        <div class="flashcards-stack ${queue.length === 1 ? 'is-single' : ''}">
          <button class="flashcards-card ${flipped ? 'is-flipped' : ''}" type="button"
            data-action="flip" aria-label="Flip card. Card ${index + 1} of ${queue.length}.">
            <span class="flashcards-face flashcards-face--front" aria-hidden="${flipped}">
              <span class="flashcards-label">${escapeHtml(topicLabel())}</span>
              <span class="flashcards-term ${termClass}">${escapeHtml(card.term)}</span>
              <span class="flashcards-divider"></span>
              <span class="flashcards-hint">Tap to flip</span>
            </span>
            <span class="flashcards-face flashcards-face--back" aria-hidden="${!flipped}">
              <span class="flashcards-label">Answer</span>
              <span class="flashcards-definition ${definitionClass}">${escapeHtml(card.definition)}</span>
            </span>
          </button>
        </div>
        <button class="flashcards-arrow flashcards-arrow--prev" type="button"
          data-action="prev" aria-label="Previous card" ${index === 0 ? 'disabled' : ''}>
          ${ICONS.prev}
        </button>
        <button class="flashcards-arrow flashcards-arrow--next" type="button"
          data-action="next" aria-label="Next card" ${index === queue.length - 1 ? 'disabled' : ''}>
          ${ICONS.next}
        </button>
      </div>
      <div class="flashcards-actions">
        <button class="btn btn--outline" type="button" data-action="again">
          ${ICONS.again} Review again
        </button>
        <button class="btn btn--primary" type="button" data-action="got-it">
          ${ICONS.check} Got it
        </button>
      </div>
    `;
  }

  function draw() {
    screen.innerHTML = `
      <div class="flashcards-top">
        <div>
          <h1>Flashcards</h1>
          <p class="flashcards-subtitle">Study smarter. Remember longer.</p>
        </div>
        ${progressHtml()}
      </div>
      <div class="flashcards-chips" role="group" aria-label="Choose a topic">${chipsHtml()}</div>
      ${viewerHtml()}
      <div class="flashcards-keep-going">
        ${ICONS.cap}
        <strong>Keep going!</strong>
        <span>Small steps make big progress.</span>
      </div>
    `;
  }

  function buildQueue() {
    const { knownCards } = getState();
    queue = deck.filter((card) => !knownCards.includes(card.id));
    index = 0;
    flipped = false;
  }

  async function loadTopic(topicId) {
    activeTopicId = topicId;
    status = 'loading';
    message = LOADING_TEXT;
    draw();

    try {
      const cards = await fetchDeck(topicId);
      if (!active || activeTopicId !== topicId) return;
      deck = cards;
      buildQueue();
      status = 'ready';
      setState({ cards: deck });
    } catch (error) {
      if (!active || activeTopicId !== topicId) return;
      deck = [];
      queue = [];
      status = 'error';
      message = ERROR_TEXT;
    }
    draw();
  }

  async function start() {
    status = 'loading';
    message = LOADING_TEXT;
    draw();

    try {
      if (!topicCache) topicCache = pickTopics(await fetchCategories());
      if (!active) return;
      topics = [...topicCache];
      await loadTopic(getStartTopicId());
    } catch (error) {
      if (!active) return;
      status = 'error';
      message = ERROR_TEXT;
      draw();
    }
  }

  function flip() {
    flipped = !flipped;
    const card = screen.querySelector('.flashcards-card');
    card.classList.toggle('is-flipped', flipped);
    screen.querySelector('.flashcards-face--front').setAttribute('aria-hidden', String(flipped));
    screen.querySelector('.flashcards-face--back').setAttribute('aria-hidden', String(!flipped));
  }

  function move(step) {
    const next = index + step;
    if (next < 0 || next > queue.length - 1) return;
    index = next;
    flipped = false;
    draw();
  }

  function reviewAgain() {
    const [card] = queue.splice(index, 1);
    queue.push(card);
    if (index > queue.length - 1) index = 0;
    flipped = false;
    draw();
  }

  function gotIt() {
    markCardKnown(queue[index].id);
    queue.splice(index, 1);
    if (index > queue.length - 1) index = Math.max(queue.length - 1, 0);
    flipped = false;
    draw();
  }

  function restart() {
    const deckIds = deck.map((card) => card.id);
    setState({ knownCards: getState().knownCards.filter((id) => !deckIds.includes(id)) });
    buildQueue();
    draw();
  }

  function retry() {
    if (topics.length > 0) loadTopic(activeTopicId);
    else start();
  }

  const actions = {
    flip,
    prev: () => move(-1),
    next: () => move(1),
    again: reviewAgain,
    'got-it': gotIt,
    restart,
    retry,
  };

  function onClick(event) {
    const chip = event.target.closest('[data-topic]');
    if (chip) {
      if (!chip.disabled) loadTopic(Number(chip.dataset.topic));
      return;
    }
    const button = event.target.closest('[data-action]');
    if (button && !button.disabled) actions[button.dataset.action]();
  }

  function onKeydown(event) {
    if (status !== 'ready' || queue.length === 0) return;
    if (event.key === 'ArrowLeft') move(-1);
    if (event.key === 'ArrowRight') move(1);
  }

  screen.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeydown);

  start();

  return () => {
    active = false;
    document.removeEventListener('keydown', onKeydown);
  };
}
