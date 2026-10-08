import { fetchCategories } from '../api.js';
import { SETTINGS } from '../config.js';
import { getState, setState } from '../state.js';
import { goTo } from '../nav.js';

const PREFERRED_TOPIC_IDS = [18, 19, 9, 17, 23, 22];
const TOPIC_COUNT = 6;
const FLASHCARDS_PER_TOPIC = 10;
const STYLESHEET_ID = 'home-styles';
const ERROR_TEXT = 'Could not load topics. Please check your internet connection and try again.';

const TOPIC_LOOKS = {
  18: {
    tile: '#ece9ff',
    color: '#5b4bdb',
    path: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12"/>',
  },
  19: {
    tile: '#dbeafe',
    color: '#1d4ed8',
    path: '<path d="M4 8h8M8 4v8M14 8h6M5 14l6 6M11 14l-6 6M14 17h6"/>',
  },
  9: {
    tile: '#fef3c7',
    color: '#b45309',
    path: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
  },
  17: {
    tile: '#dcfce7',
    color: '#15803d',
    path: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 15h9"/>',
  },
  23: {
    tile: '#ffedd5',
    color: '#c2410c',
    path: '<path d="M3 10l9-6 9 6H3zM5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  },
  22: {
    tile: '#cffafe',
    color: '#0e7490',
    path: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  },
};

const DEFAULT_LOOK = {
  tile: '#fdebd3',
  color: '#c2410c',
  path: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5"/>',
};

const ICONS = {
  play: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>',
  cards:
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="3" width="13" height="13" rx="3"/><path d="M16 20H6a3 3 0 0 1-3-3V8"/></svg>',
  arrow:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  chevron:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  check:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
};

const ART = `
  <svg class="home-art" viewBox="0 0 260 210" aria-hidden="true">
    <ellipse cx="130" cy="188" rx="92" ry="10" fill="#f0d3be" opacity="0.7" />
    <rect x="118" y="42" width="100" height="118" rx="14" fill="#fdebd3" transform="rotate(12 168 101)" />
    <rect x="56" y="36" width="108" height="122" rx="14" fill="#c2410c" transform="rotate(-12 110 97)" />
    <g transform="translate(110 97) rotate(-12) translate(-37 -37) scale(1.16)" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M31 5v4.5M11 10.5l3.5 3.5M51 10.5L47.5 14M3 21l4.5 2.5M59 21l-4.5 2.5" />
      <path d="M31 17C28 14.5 22.5 14 19.5 17 14 16.5 11.5 21 12.5 25 8 27 7.5 33 10.5 36 8.5 41 11 46.5 15 47 15.5 52 20 55.5 25 54.5 27 57 30 57 31 56" />
      <path d="M31 17C34 14.5 39.5 14 42.5 17 48 16.5 50.5 21 49.5 25 54 27 54.5 33 51.5 36 53.5 41 51 46.5 47 47 46.5 52 42 55.5 37 54.5 35 57 32 57 31 56" />
      <path d="M31 17v39" />
      <path d="M20 24.5l2 2.5M15 34l9.5 3.5M18 44l3.5 2" />
      <path d="M42 24.5l-2 2.5M47 34l-9.5 3.5M44 44l-3.5 2" />
    </g>
    <g stroke="#e8570f" stroke-width="3.5" stroke-linecap="round">
      <path d="M38 50l9 6M66 22l5 11M226 84l14-5M230 112l14 5" />
    </g>
  </svg>
`;

let topicCache = null;

function ensureStyles() {
  if (document.getElementById(STYLESHEET_ID)) return;
  const link = document.createElement('link');
  link.id = STYLESHEET_ID;
  link.rel = 'stylesheet';
  link.href = new URL('../../css/screens/home.css', import.meta.url).href;
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

function cleanLabel(name) {
  return name.replace(/^(Science|Entertainment):\s*/, '');
}

function pickTopics(categories) {
  const preferred = PREFERRED_TOPIC_IDS.map((id) =>
    categories.find((category) => category.id === id),
  ).filter(Boolean);
  const others = categories.filter((category) => !preferred.includes(category));
  return [...preferred, ...others]
    .slice(0, TOPIC_COUNT)
    .map((category) => ({ id: category.id, label: cleanLabel(category.name) }));
}

export function render(root) {
  ensureStyles();

  root.innerHTML = '<section class="home" aria-label="Home"></section>';
  const screen = root.firstElementChild;

  let active = true;
  let status = 'loading';
  let topics = [];
  let selectedId = null;

  function getStartId() {
    const saved = getState().topic;
    const savedId = saved ? Number(saved.id) : NaN;
    return topics.some((topic) => topic.id === savedId) ? savedId : topics[0].id;
  }

  function selectedTopic() {
    return topics.find((topic) => topic.id === selectedId);
  }

  function topicHtml(topic) {
    const look = TOPIC_LOOKS[topic.id] || DEFAULT_LOOK;
    const selected = topic.id === selectedId;
    return `
      <li>
        <button class="home-topic ${selected ? 'is-selected' : ''}" type="button"
          data-topic="${topic.id}" aria-pressed="${selected}">
          <span class="home-topic-icon" style="background: ${look.tile}; color: ${look.color}">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${look.path}</svg>
          </span>
          <span class="home-topic-text">
            <span class="home-topic-name">${escapeHtml(topic.label)}</span>
            <span class="home-topic-meta">${SETTINGS.questionsPerQuiz} Questions &middot; ${FLASHCARDS_PER_TOPIC} Flashcards</span>
          </span>
          <span class="home-topic-check">${ICONS.check}</span>
          <span class="home-topic-chevron">${ICONS.chevron}</span>
        </button>
      </li>
    `;
  }

  function topicsHtml() {
    if (status === 'loading') {
      return `
        <div class="card home-message">
          <p role="status">Getting topics...</p>
        </div>
      `;
    }

    if (status === 'error') {
      return `
        <div class="card home-message">
          <p role="status">${escapeHtml(ERROR_TEXT)}</p>
          <button class="btn btn--primary" type="button" data-action="retry">Try again</button>
        </div>
      `;
    }

    return `<ul class="home-topics">${topics.map(topicHtml).join('')}</ul>`;
  }

  function draw() {
    const ready = status === 'ready';
    screen.innerHTML = `
      <div class="home-hero">
        <div class="home-hero-text">
          <h1>Flip it till you know it.</h1>
          <p>Turn your study sessions into quick quizzes and interactive flashcards.</p>
        </div>
        ${ART}
      </div>
      <h2 class="home-heading">Choose a topic</h2>
      ${topicsHtml()}
      <div class="home-actions">
        <button class="btn btn--primary home-action" type="button" data-action="quiz" ${ready ? '' : 'disabled'}>
          <span class="home-action-label">${ICONS.play} Start Quiz</span>
          ${ICONS.arrow}
        </button>
        <button class="btn btn--outline home-action" type="button" data-action="flashcards" ${ready ? '' : 'disabled'}>
          <span class="home-action-label">${ICONS.cards} Study Flashcards</span>
          ${ICONS.arrow}
        </button>
      </div>
    `;
  }

  async function start() {
    status = 'loading';
    draw();

    try {
      if (!topicCache) topicCache = pickTopics(await fetchCategories());
      if (!active) return;
      topics = [...topicCache];
      selectedId = getStartId();
      status = 'ready';
    } catch (error) {
      if (!active) return;
      status = 'error';
    }
    draw();
  }

  function select(topicId) {
    selectedId = topicId;
    screen.querySelectorAll('.home-topic').forEach((button) => {
      const selected = Number(button.dataset.topic) === topicId;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function startQuiz() {
    const topic = selectedTopic();
    setState({ autoStartTopic: { id: topic.id, label: topic.label } });
    goTo('quiz');
  }

  function studyFlashcards() {
    const topic = selectedTopic();
    setState({ topic: { id: topic.id, label: topic.label } });
    goTo('flashcards');
  }

  const actions = {
    quiz: startQuiz,
    flashcards: studyFlashcards,
    retry: start,
  };

  function onClick(event) {
    const topic = event.target.closest('[data-topic]');
    if (topic) {
      select(Number(topic.dataset.topic));
      return;
    }
    const button = event.target.closest('[data-action]');
    if (button && !button.disabled) actions[button.dataset.action]();
  }

  screen.addEventListener('click', onClick);
  start();

  return () => {
    active = false;
  };
}