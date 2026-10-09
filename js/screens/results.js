import { getCategories } from '../api.js';
import { MESSAGES } from '../config.js';
import { getState, setState, resetQuiz } from '../state.js';
import { onUserChange, getUser } from '../auth.js';
import { saveQuizResult } from '../database.js';
import { goTo } from '../nav.js';
import { escapeHtml, formatDuration } from '../helpers.js';
import { ICONS } from '../icons.js';

function getSummary() {
  const state = getState();
  if (!state.finished || state.questions.length === 0) {
    return null;
  }

  let correct = 0;
  let answered = 0;
  for (let i = 0; i < state.questions.length; i++) {
    const answer = state.answers[i];
    if (answer && answer.pickedIndex !== -1) {
      answered++;
    }
    if (answer && answer.isCorrect) {
      correct++;
    }
  }

  const total = state.questions.length;
  return {
    category: state.selectedCategory,
    total: total,
    answered: answered,
    correct: correct,
    wrong: total - correct,
    percent: Math.round((correct / total) * 100),
    timeUsedSeconds: state.timeUsedSeconds,
  };
}

function getFeedback(percent) {
  if (percent >= 80) {
    return {
      title: 'Great job!',
      text: 'You scored ' + percent + '%. Keep going, you\'re making progress!',
    };
  }
  if (percent >= 50) {
    return {
      title: 'Good effort!',
      text: 'You scored ' + percent + '%. A little more practice and you\'ll get there.',
    };
  }
  return {
    title: 'Keep practicing!',
    text: 'You scored ' + percent + '%. Review the questions you missed and try again.',
  };
}

export function render(root) {
  let active = true;
  const summary = getSummary();

  if (!summary) {
    root.innerHTML = `
      <section class="results results-empty">
        <h1>Quiz Results</h1>
        <p>You have no results yet. Take a quiz to see how you did.</p>
        <button class="btn btn--primary" id="results-start" type="button">Start a quiz</button>
      </section>
    `;
    root.querySelector('#results-start').addEventListener('click', function () {
      goTo('home');
    });
    return null;
  }

  const feedback = getFeedback(summary.percent);
  let ringClass = 'results-ring-fill';
  if (summary.percent === 0) {
    ringClass = 'results-ring-fill results-ring-fill--empty';
  }

  root.innerHTML = `
    <section class="results">
      <header class="results-header">
        <button class="results-back" id="results-back" type="button" aria-label="Back to home">
          ${ICONS.back}
        </button>
        <div>
          <h1>Quiz Results</h1>
          <p class="results-subtitle">
            ${feedback.title} You answered ${summary.answered} of ${summary.total} questions.
          </p>
        </div>
      </header>

      <div class="results-summary card">
        <div class="results-ring" role="img" aria-label="Your score: ${summary.percent} percent">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle class="results-ring-track" cx="60" cy="60" r="52" pathLength="100"></circle>
            <circle
              class="${ringClass}"
              id="results-ring-fill"
              cx="60"
              cy="60"
              r="52"
              pathLength="100"
              stroke-dasharray="0 100"
            ></circle>
          </svg>
          <div class="results-ring-label">
            <strong>${summary.percent}%</strong>
            <span>Your Score</span>
          </div>
        </div>

        <div class="results-stats">
          <div class="results-stat results-stat--correct">
            <span class="results-stat-icon">${ICONS.check}</span>
            <div>
              <strong class="results-stat-value">${summary.correct}</strong>
              <span class="results-stat-label">Correct</span>
            </div>
          </div>
          <div class="results-stat results-stat--wrong">
            <span class="results-stat-icon">${ICONS.cross}</span>
            <div>
              <strong class="results-stat-value">${summary.wrong}</strong>
              <span class="results-stat-label">Wrong</span>
            </div>
          </div>
          <div class="results-stat results-stat--time">
            <span class="results-stat-icon">${ICONS.clock}</span>
            <div>
              <strong class="results-stat-value">${formatDuration(summary.timeUsedSeconds)}</strong>
              <span class="results-stat-label">Time Used</span>
            </div>
          </div>
        </div>

        <div class="results-message">
          <span class="results-message-icon">${ICONS.trophy}</span>
          <div>
            <strong>${feedback.title}</strong>
            <p>${feedback.text}</p>
          </div>
        </div>
      </div>

      <p class="results-note" id="results-note"></p>

      <div class="results-actions">
        <button class="btn btn--primary" id="results-view" type="button">
          ${ICONS.eye} View Questions
        </button>
        <button class="btn btn--outline" id="results-retake" type="button">
          ${ICONS.retake} Retake Quiz
        </button>
      </div>

      <section class="results-switch card" aria-labelledby="results-switch-title">
        <div class="results-switch-head">
          <span class="results-switch-icon">${ICONS.deck}</span>
          <div>
            <h2 class="results-switch-title" id="results-switch-title">Switch Deck</h2>
            <p class="results-switch-sub">Try a different topic and keep learning.</p>
          </div>
        </div>
        <ul class="results-chips" id="results-chips"></ul>
      </section>
    </section>
  `;

  const note = root.querySelector('#results-note');
  const chipList = root.querySelector('#results-chips');

  const ringFill = root.querySelector('#results-ring-fill');
  requestAnimationFrame(function () {
    ringFill.setAttribute('stroke-dasharray', summary.percent + ' 100');
  });

  function startQuizWith(category) {
    setState({ selectedCategory: category });
    resetQuiz();
    goTo('quiz');
  }

  async function saveResult() {
    if (!getUser()) {
      note.textContent = MESSAGES.signInTip + '.';
      return;
    }

    const state = getState();
    if (state.resultSaved === true) {
      note.textContent = 'This result is saved to your progress.';
      return;
    }
    if (state.resultSaved === 'saving') {
      note.textContent = 'Saving your result...';
      return;
    }

    setState({ resultSaved: 'saving' });
    note.textContent = 'Saving your result...';

    try {
      await saveQuizResult({
        category: summary.category.name,
        categoryId: summary.category.id,
        difficulty: state.difficulty || 'any',
        total: summary.total,
        answered: summary.answered,
        correct: summary.correct,
        wrong: summary.wrong,
        percent: summary.percent,
        timeUsedSeconds: summary.timeUsedSeconds,
      });
      setState({ resultSaved: true });
      if (active) {
        note.textContent = 'This result is saved to your progress.';
      }
    } catch (error) {
      setState({ resultSaved: false });
      if (active) {
        note.textContent = 'Could not save this result. Check your connection and try again.';
      }
    }
  }

  async function showChips() {
    let categories = [];
    try {
      categories = await getCategories();
    } catch (error) {
      return;
    }
    if (!active) {
      return;
    }

    let html = `
      <li>
        <button class="results-chip" type="button" data-id="${summary.category.id}" data-name="${escapeHtml(summary.category.name)}" aria-pressed="true">
          ${escapeHtml(summary.category.name)}
        </button>
      </li>
    `;
    let added = 0;
    for (let i = 0; i < categories.length && added < 5; i++) {
      if (categories[i].id === summary.category.id) {
        continue;
      }
      html += `
        <li>
          <button class="results-chip" type="button" data-id="${categories[i].id}" data-name="${escapeHtml(categories[i].name)}" aria-pressed="false">
            ${escapeHtml(categories[i].name)}
          </button>
        </li>
      `;
      added++;
    }
    html += `
      <li>
        <button class="results-chip" type="button" id="more-topics" aria-pressed="false">More topics</button>
      </li>
    `;
    chipList.innerHTML = html;

    const chips = chipList.querySelectorAll('.results-chip');
    for (let i = 0; i < chips.length; i++) {
      chips[i].addEventListener('click', handleChipClick);
    }
  }

  function handleChipClick(event) {
    const button = event.currentTarget;
    if (button.id === 'more-topics') {
      goTo('decks');
      return;
    }
    startQuizWith({ id: Number(button.dataset.id), name: button.dataset.name });
  }

  root.querySelector('#results-back').addEventListener('click', function () {
    goTo('home');
  });
  root.querySelector('#results-view').addEventListener('click', function () {
    goTo('review');
  });
  root.querySelector('#results-retake').addEventListener('click', function () {
    startQuizWith(summary.category);
  });

  const stopListening = onUserChange(saveResult);
  saveResult();
  showChips();

  return function () {
    active = false;
    stopListening();
  };
}
