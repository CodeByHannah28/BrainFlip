import { getState, setState } from '../state.js';
import { goTo } from '../nav.js';
import { TOPICS, getTopicData } from '../../data/topics.js';

const STYLESHEET_ID = 'review-styles';

const ICONS = {
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  check:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  cross:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  topic:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
  chevron:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
};

function ensureStyles() {
  if (document.getElementById(STYLESHEET_ID)) return;
  const link = document.createElement('link');
  link.id = STYLESHEET_ID;
  link.rel = 'stylesheet';
  link.href = new URL('../../css/screens/review.css', import.meta.url).href;
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

export function render(root) {
  ensureStyles();
  const state = getState();
  let filter = 'all';

  function renderView() {
    const totalQuestions = state.questions.length;
    const missedQuestions = state.answers.filter((a) => !a.isCorrect).length;

    if (totalQuestions === 0) {
      root.innerHTML = `
        <section class="review">
          <header class="review-header">
            <div class="review-header-title">
              <button class="review-back" id="review-back" type="button" aria-label="Back to results">${ICONS.back}</button>
              <div>
                <h1>Review Answers</h1>
                <p class="review-subtitle">See how you did and learn from your mistakes.</p>
              </div>
            </div>
          </header>
          <div class="card review-empty">
            <p>No quiz data found. Take a quiz first!</p>
            <button class="btn btn--primary" id="review-go-home" style="margin-top: var(--space-4);">Go Home</button>
          </div>
        </section>
      `;
      root.querySelector('#review-back').addEventListener('click', () => goTo('results'));
      root.querySelector('#review-go-home').addEventListener('click', () => goTo('home'));
      return;
    }

    const filteredAnswers = state.answers.filter((a) => filter === 'all' || !a.isCorrect);

    const cardsMarkup = filteredAnswers
      .map((answer) => {
        const question = state.questions.find((q) => q.id === answer.questionId);
        if (!question) return '';

        const questionNum = String(state.questions.indexOf(question) + 1).padStart(2, '0');
        const optionLabels = ['A', 'B', 'C', 'D'];
        const codeMarkup = question.code
          ? `<div class="review-code">${escapeHtml(question.code)}</div>`
          : '';

        const optionsMarkup = question.options
          .map((opt, idx) => {
            let stateClass = '';
            if (idx === answer.correctIndex) stateClass = 'is-correct';
            else if (idx === answer.pickedIndex) stateClass = 'is-wrong';

            return `
          <div class="review-option ${stateClass}">
            <div class="review-radio"></div>
            <span>${optionLabels[idx]}. ${escapeHtml(opt)}</span>
          </div>
        `;
          })
          .join('');

        const resultClass = answer.isCorrect ? 'review-result--correct' : 'review-result--wrong';
        const resultIcon = answer.isCorrect ? ICONS.check : ICONS.cross;
        const resultTitle = answer.isCorrect ? 'Correct' : 'Incorrect';

        const choiceText = answer.isCorrect
          ? `You selected <strong>${optionLabels[answer.pickedIndex]}. ${escapeHtml(question.options[answer.pickedIndex])}</strong>`
          : `You selected <strong style="color: var(--color-wrong-text);">${optionLabels[answer.pickedIndex]}. ${escapeHtml(question.options[answer.pickedIndex])}</strong><br>The correct answer is <strong>${optionLabels[answer.correctIndex]}. ${escapeHtml(question.options[answer.correctIndex])}</strong>`;

        return `
        <div class="review-card">
          <div class="review-card-main">
            <div class="review-card-header">
              <span class="review-number">${questionNum}</span>
              <div class="review-question-block">
                <p class="review-question">${escapeHtml(question.question)}</p>
                ${codeMarkup}
                <div class="review-options">
                  ${optionsMarkup}
                </div>
              </div>
            </div>
          </div>
          <div class="review-result ${resultClass}">
            <div class="review-result-icon">${resultIcon}</div>
            <div>
              <p class="review-result-title">${resultTitle}</p>
              <p class="review-result-choice">${choiceText}</p>
              ${question.explanation ? `<p class="review-result-explanation">${escapeHtml(question.explanation)}</p>` : ''}
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    const topicData = state.topic ? getTopicData(state.topic.id) : null;
    const topicIconMarkup = topicData
      ? `<span class="review-topic-icon" style="background: ${topicData.tile}; color: ${topicData.color};"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${topicData.path}</svg></span>`
      : ICONS.topic;

    const dropdownMarkup = TOPICS.map(
      (t) => `
      <li role="option" data-id="${t.id}" data-label="${escapeHtml(t.label)}">
        <span class="review-topic-icon" style="background: ${t.tile}; color: ${t.color};">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${t.path}</svg>
        </span>
        ${escapeHtml(t.label)}
      </li>
    `,
    ).join('');

    root.innerHTML = `
      <section class="review">
        <header class="review-header">
          <div class="review-header-title">
            <button class="review-back" id="review-back" type="button" aria-label="Back to results">${ICONS.back}</button>
            <div>
              <h1>Review Answers</h1>
              <p class="review-subtitle">See how you did and learn from your mistakes.</p>
            </div>
          </div>
          
          <div class="review-dropdown-container">
            <button class="review-topic-label" id="review-topic-btn" type="button" aria-haspopup="listbox" aria-expanded="false">
              ${topicIconMarkup}
              <span>${state.topic ? escapeHtml(state.topic.label) : 'Quiz'}</span>
              <span class="review-topic-chevron">${ICONS.chevron}</span>
            </button>
            <ul class="review-dropdown" id="review-dropdown-list" role="listbox" hidden>
              ${dropdownMarkup}
            </ul>
          </div>
        </header>

        <div class="review-filters" role="group" aria-label="Filter answers">
          <button class="review-filter" data-filter="all" aria-pressed="${filter === 'all'}">
            All <span class="review-badge">${totalQuestions}</span>
          </button>
          <button class="review-filter" data-filter="missed" aria-pressed="${filter === 'missed'}">
            Missed <span class="review-badge">${missedQuestions}</span>
          </button>
        </div>

        <div class="review-list">
          ${cardsMarkup || '<p class="review-empty">No missed questions!</p>'}
        </div>
      </section>
    `;

    // Dropdown Logic
    const dropdownBtn = root.querySelector('#review-topic-btn');
    const dropdownList = root.querySelector('#review-dropdown-list');

    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = dropdownList.hidden;
      dropdownList.hidden = !isHidden;
      dropdownBtn.setAttribute('aria-expanded', String(!isHidden));
    });

    document.addEventListener('click', (e) => {
      if (!dropdownBtn.contains(e.target) && dropdownList) {
        dropdownList.hidden = true;
        dropdownBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Route to Flashcards
    dropdownList.querySelectorAll('li').forEach((item) => {
      item.addEventListener('click', () => {
        const id = Number(item.dataset.id);
        const label = item.dataset.label;
        setState({ topic: { id, label } });
        goTo('flashcards');
      });
    });

    root.querySelector('#review-back').addEventListener('click', () => goTo('results'));

    root.querySelectorAll('.review-filter').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        filter = e.currentTarget.dataset.filter;
        renderView();
      });
    });
  }

  renderView();
}
