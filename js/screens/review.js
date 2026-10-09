import { getState } from '../state.js';
import { goTo } from '../nav.js';
import { escapeHtml, getLetter } from '../helpers.js';
import { ICONS } from '../icons.js';

function getItems() {
  const state = getState();
  const items = [];
  for (let i = 0; i < state.questions.length; i++) {
    const answer = state.answers[i];
    if (answer) {
      items.push({ number: i + 1, question: state.questions[i], answer: answer });
    }
  }
  return items;
}

function makeItemHtml(item) {
  const question = item.question;
  const answer = item.answer;
  const number = String(item.number).padStart(2, '0');

  let optionsHtml = '';
  for (let i = 0; i < question.options.length; i++) {
    let className = 'review-option';
    if (i === answer.pickedIndex && answer.isCorrect) {
      className = 'review-option review-option--correct';
    } else if (i === answer.pickedIndex) {
      className = 'review-option review-option--wrong';
    }
    optionsHtml += `
      <li class="${className}">
        <span class="review-radio"></span>
        <span>${getLetter(i)}. ${escapeHtml(question.options[i])}</span>
      </li>
    `;
  }

  const correctText = getLetter(question.correctIndex) + '. ' + question.options[question.correctIndex];
  let resultHtml = '';

  if (answer.isCorrect) {
    resultHtml = `
      <div class="review-result review-result--correct">
        <span class="review-result-icon">${ICONS.check}</span>
        <div>
          <strong>Correct</strong>
          <p>You selected ${getLetter(answer.pickedIndex)}. ${escapeHtml(question.options[answer.pickedIndex])}</p>
        </div>
      </div>
    `;
  } else if (answer.pickedIndex === -1) {
    resultHtml = `
      <div class="review-result review-result--wrong">
        <span class="review-result-icon">${ICONS.cross}</span>
        <div>
          <strong>Time is up</strong>
          <p>You did not select an answer.</p>
          <p>The correct answer is ${escapeHtml(correctText)}.</p>
        </div>
      </div>
    `;
  } else {
    resultHtml = `
      <div class="review-result review-result--wrong">
        <span class="review-result-icon">${ICONS.cross}</span>
        <div>
          <strong>Incorrect</strong>
          <p>You selected ${getLetter(answer.pickedIndex)}. ${escapeHtml(question.options[answer.pickedIndex])}</p>
          <p>The correct answer is ${escapeHtml(correctText)}.</p>
        </div>
      </div>
    `;
  }

  return `
    <li class="review-item">
      <span class="review-number">${number}</span>
      <div>
        <h2 class="review-question">${escapeHtml(question.question)}</h2>
        <ul class="review-options">${optionsHtml}</ul>
      </div>
      ${resultHtml}
    </li>
  `;
}

export function render(root) {
  const items = getItems();

  if (items.length === 0) {
    root.innerHTML = `
      <section class="review review-empty">
        <h1>Review Answers</h1>
        <p>You have no answers to review yet. Take a quiz first.</p>
        <button class="btn btn--primary" id="review-start" type="button">Start a quiz</button>
      </section>
    `;
    root.querySelector('#review-start').addEventListener('click', function () {
      goTo('home');
    });
    return null;
  }

  const missed = items.filter(function (item) {
    return !item.answer.isCorrect;
  });
  let tab = 'all';

  root.innerHTML = `
    <section class="review">
      <header class="review-header">
        <button class="review-back" id="review-back" type="button" aria-label="Back to results">
          ${ICONS.back}
        </button>
        <div>
          <h1>Review Answers</h1>
          <p class="review-subtitle">See how you did and learn from your mistakes.</p>
        </div>
      </header>
      <span class="review-topic">${escapeHtml(getState().selectedCategory.name)}</span>
      <div class="review-tabs">
        <button class="review-tab" id="tab-all" type="button" aria-pressed="true">
          All <span class="review-count">${items.length}</span>
        </button>
        <button class="review-tab" id="tab-missed" type="button" aria-pressed="false">
          Missed <span class="review-count">${missed.length}</span>
        </button>
      </div>
      <ul class="review-list" id="review-list"></ul>
    </section>
  `;

  const list = root.querySelector('#review-list');
  const allTab = root.querySelector('#tab-all');
  const missedTab = root.querySelector('#tab-missed');

  function showList() {
    let shown = items;
    if (tab === 'missed') {
      shown = missed;
    }

    let html = '';
    for (let i = 0; i < shown.length; i++) {
      html += makeItemHtml(shown[i]);
    }
    if (shown.length === 0) {
      html = '<li><p>You did not miss any questions. Great work!</p></li>';
    }
    list.innerHTML = html;

    allTab.setAttribute('aria-pressed', String(tab === 'all'));
    missedTab.setAttribute('aria-pressed', String(tab === 'missed'));
  }

  allTab.addEventListener('click', function () {
    tab = 'all';
    showList();
  });
  missedTab.addEventListener('click', function () {
    tab = 'missed';
    showList();
  });
  root.querySelector('#review-back').addEventListener('click', function () {
    goTo('results');
  });

  showList();
  return null;
}
