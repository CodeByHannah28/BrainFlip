import { getCategories, getCategoryCounts } from '../api.js';
import { SETTINGS, MESSAGES } from '../config.js';
import { getState, setState, resetQuiz, resetFlashcards } from '../state.js';
import { goTo } from '../nav.js';
import { escapeHtml, showLoading, showError } from '../helpers.js';
import { ICONS } from '../icons.js';

export function render(root) {
  let active = true;

  root.innerHTML = `
    <section class="home">
      <header class="home-hero">
        <div>
          <h1 class="home-title">Flip it till you know it.</h1>
          <p class="home-subtitle">
            Turn your study sessions into quick quizzes and interactive flashcards.
          </p>
        </div>
        <div class="home-art" aria-hidden="true">
          <div class="home-art-back"></div>
          <div class="home-art-front">
            <img
              src="https://res.cloudinary.com/j7xyduzb/image/upload/v1791200860/brain_logo_1.png"
              alt=""
            />
          </div>
        </div>
      </header>
      <h2 class="home-heading">Choose a topic</h2>
      <div id="home-content"></div>
    </section>
  `;

  const content = root.querySelector('#home-content');
  let categories = [];
  let counts = {};

  async function loadTopics() {
    showLoading(content, MESSAGES.loadingTopics);
    try {
      categories = await getCategories();
      counts = await getCategoryCounts();
    } catch (error) {
      if (active) {
        showError(content, 'Could not load topics', MESSAGES.topicsError, loadTopics);
      }
      return;
    }
    if (!active) {
      return;
    }
    if (!getState().selectedCategory) {
      setState({ selectedCategory: { id: categories[0].id, name: categories[0].name } });
    }
    showTopics();
  }

  function showTopics() {
    const state = getState();
    let topicsHtml = '';

    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      const selected = state.selectedCategory.id === category.id;
      let countText = '';
      if (typeof counts[category.id] === 'number') {
        countText = counts[category.id] + ' questions';
      }
      let mark = ICONS.chevron;
      if (selected) {
        mark = ICONS.check;
      }

      topicsHtml += `
        <button class="topic-card" type="button" data-id="${category.id}" aria-pressed="${selected}">
          <span class="topic-icon tint-${i % 5}">${ICONS.deck}</span>
          <span class="topic-text">
            <span class="topic-name">${escapeHtml(category.name)}</span>
            <span class="topic-count">${countText}</span>
          </span>
          <span class="topic-mark">${mark}</span>
        </button>
      `;
    }

    let difficultyHtml = '';
    const difficulties = [
      { value: '', label: 'Any' },
      { value: 'easy', label: 'Easy' },
      { value: 'medium', label: 'Medium' },
      { value: 'hard', label: 'Hard' },
    ];
    for (let i = 0; i < difficulties.length; i++) {
      let selectedText = '';
      if (difficulties[i].value === state.difficulty) {
        selectedText = 'selected';
      }
      difficultyHtml += `<option value="${difficulties[i].value}" ${selectedText}>${difficulties[i].label}</option>`;
    }

    let amountHtml = '';
    for (let i = 0; i < SETTINGS.amountOptions.length; i++) {
      let selectedText = '';
      if (SETTINGS.amountOptions[i] === state.amount) {
        selectedText = 'selected';
      }
      amountHtml += `<option value="${SETTINGS.amountOptions[i]}" ${selectedText}>${SETTINGS.amountOptions[i]}</option>`;
    }

    content.innerHTML = `
      <div class="topic-grid">${topicsHtml}</div>
      <div class="home-options">
        <label class="field">
          <span>Difficulty</span>
          <select id="difficulty">${difficultyHtml}</select>
        </label>
        <label class="field">
          <span>Questions</span>
          <select id="amount">${amountHtml}</select>
        </label>
      </div>
      <div class="home-actions">
        <button class="btn btn--primary" id="start-quiz" type="button">
          <span class="home-actions-label">${ICONS.play} Start Quiz</span>
          ${ICONS.arrowRight}
        </button>
        <button class="btn btn--outline" id="start-cards" type="button">
          <span class="home-actions-label">${ICONS.deck} Study Flashcards</span>
          ${ICONS.arrowRight}
        </button>
      </div>
    `;

    const cards = content.querySelectorAll('.topic-card');
    for (let i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', handleTopicClick);
    }
    content.querySelector('#difficulty').addEventListener('change', handleDifficultyChange);
    content.querySelector('#amount').addEventListener('change', handleAmountChange);
    content.querySelector('#start-quiz').addEventListener('click', startQuiz);
    content.querySelector('#start-cards').addEventListener('click', startCards);
  }

  function handleTopicClick(event) {
    const id = Number(event.currentTarget.dataset.id);
    for (let i = 0; i < categories.length; i++) {
      if (categories[i].id === id) {
        setState({ selectedCategory: { id: id, name: categories[i].name } });
      }
    }
    showTopics();
  }

  function handleDifficultyChange(event) {
    setState({ difficulty: event.target.value });
  }

  function handleAmountChange(event) {
    setState({ amount: Number(event.target.value) });
  }

  function startQuiz() {
    resetQuiz();
    goTo('quiz');
  }

  function startCards() {
    resetFlashcards();
    goTo('flashcards');
  }

  loadTopics();

  return function () {
    active = false;
  };
}
