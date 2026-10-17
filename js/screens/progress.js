import { MESSAGES } from '../config.js';
import { getUser, isAuthReady, onUserChange, signInWithGoogle } from '../auth.js';
import { loadProgress } from '../database.js';
import { escapeHtml, formatDate, formatDuration, showLoading, showError } from '../helpers.js';
import { ICONS } from '../icons.js';
import { topicIconHtml } from '../topic-icon.js';

const PASS_MARK = 50;

const TREND_ICON =
  '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>';

const DEVICE_ICON =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>';

function isPass(percent) {
  return percent >= PASS_MARK;
}

export function render(root) {
  let active = true;

  root.innerHTML = `
    <section class="progress">
      <header class="progress-header" id="progress-header">
        <h1>Progress</h1>
        <p class="progress-subtitle">Your saved quizzes and flashcard study.</p>
      </header>
      <div id="progress-content"></div>
    </section>
  `;

  const header = root.querySelector('#progress-header');
  const content = root.querySelector('#progress-content');

  function showGuest() {
    header.hidden = true;
    content.innerHTML = `
      <div class="progress-guest">
        <div class="progress-guest-card">
          <span class="progress-guest-icon">${TREND_ICON}</span>
          <p class="progress-guest-kicker">Progress</p>
          <h1 class="progress-guest-title">Save your progress</h1>
          <p class="progress-guest-text">${escapeHtml(MESSAGES.guest)}</p>
          <ul class="progress-perks">
            <li class="progress-perk"><span class="progress-perk-icon">${ICONS.trophy}</span><span>Quiz scores</span></li>
            <li class="progress-perk"><span class="progress-perk-icon">${ICONS.deck}</span><span>Flashcard progress</span></li>
            <li class="progress-perk"><span class="progress-perk-icon">${DEVICE_ICON}</span><span>Any device</span></li>
          </ul>
          <button class="btn btn--primary progress-guest-btn" id="progress-sign-in" type="button">
            <span class="progress-google">G</span> Sign in with Google
          </button>
        </div>
      </div>
    `;
    content.querySelector('#progress-sign-in').addEventListener('click', function () {
      signInWithGoogle().catch(function () {});
    });
  }

  function showData(data) {
    header.hidden = false;
    const quizzes = data.quizzes;
    const flashcards = data.flashcards;

    let totalPercent = 0;
    let best = 0;
    for (let i = 0; i < quizzes.length; i++) {
      totalPercent += quizzes[i].percent;
      if (quizzes[i].percent > best) {
        best = quizzes[i].percent;
      }
    }
    let average = 0;
    if (quizzes.length > 0) {
      average = Math.round(totalPercent / quizzes.length);
    }

    let quizHtml = '<li class="progress-empty">No saved quizzes yet. Take a quiz while signed in.</li>';
    if (quizzes.length > 0) {
      quizHtml = '';
    }
    for (let i = 0; i < quizzes.length; i++) {
      const quiz = quizzes[i];
      const passed = isPass(quiz.percent);
      const scoreClass = passed ? 'progress-score--pass' : 'progress-score--fail';
      const scoreWord = passed ? 'Passed' : 'Failed';
      quizHtml += `
        <li class="progress-row">
          ${topicIconHtml(quiz.categoryId, 48)}
          <div class="progress-row-main">
            <span class="progress-row-name">${escapeHtml(quiz.category)}</span>
            <span class="progress-row-detail">${quiz.correct} of ${quiz.total} correct, ${formatDuration(quiz.timeUsedSeconds)}</span>
            <span class="progress-row-date">${escapeHtml(formatDate(quiz.createdAt))}</span>
          </div>
          <span class="progress-score ${scoreClass}">
            <strong>${quiz.percent}%</strong>
            <span>${scoreWord}</span>
          </span>
        </li>
      `;
    }

    let cardsHtml = '<li class="progress-empty">No flashcard progress yet. Study a deck while signed in.</li>';
    if (flashcards.length > 0) {
      cardsHtml = '';
    }
    for (let i = 0; i < flashcards.length; i++) {
      const deck = flashcards[i];
      cardsHtml += `
        <li class="progress-row progress-row--deck">
          ${topicIconHtml(deck.id, 48)}
          <div class="progress-row-main">
            <span class="progress-row-name">${escapeHtml(deck.category)}</span>
            <span class="progress-row-detail">${deck.gotIt || 0} got it, ${deck.reviewAgain || 0} marked review again</span>
            <span class="progress-row-date">${escapeHtml(formatDate(deck.updatedAt))}</span>
          </div>
        </li>
      `;
    }

    content.innerHTML = `
      <div class="progress-stats">
        <div class="progress-stat">
          <span class="progress-stat-icon">${ICONS.play}</span>
          <strong>${quizzes.length}</strong>
          <span class="progress-stat-label">Quizzes</span>
        </div>
        <div class="progress-stat">
          <span class="progress-stat-icon">${ICONS.clock}</span>
          <strong>${average}%</strong>
          <span class="progress-stat-label">Average</span>
        </div>
        <div class="progress-stat">
          <span class="progress-stat-icon">${ICONS.trophy}</span>
          <strong>${best}%</strong>
          <span class="progress-stat-label">Best</span>
        </div>
      </div>
      <p class="progress-legend">Pass mark: ${PASS_MARK}% or higher.</p>
      <section class="progress-section">
        <h2>Recent quizzes</h2>
        <ul class="progress-list">${quizHtml}</ul>
      </section>
      <section class="progress-section">
        <h2>Flashcards</h2>
        <ul class="progress-list">${cardsHtml}</ul>
      </section>
    `;
  }

  async function showSaved() {
    header.hidden = false;
    showLoading(content, 'Loading your progress...');
    try {
      const data = await loadProgress();
      if (active) {
        showData(data);
      }
    } catch (error) {
      if (active) {
        showError(
          content,
          'Could not load progress',
          'Please check your internet connection and try again.',
          showSaved,
        );
      }
    }
  }

  function draw() {
    if (!isAuthReady()) {
      header.hidden = false;
      showLoading(content, 'Checking your sign in...');
    } else if (getUser()) {
      showSaved();
    } else {
      showGuest();
    }
  }

  const stopListening = onUserChange(draw);
  draw();

  return function () {
    active = false;
    stopListening();
  };
}