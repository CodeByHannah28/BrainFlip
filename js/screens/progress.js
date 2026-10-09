import { MESSAGES } from '../config.js';
import { getUser, isAuthReady, onUserChange, signInWithGoogle } from '../auth.js';
import { loadProgress } from '../database.js';
import { escapeHtml, formatDate, formatDuration, showLoading, showError } from '../helpers.js';

export function render(root) {
  let active = true;

  root.innerHTML = `
    <section class="progress">
      <h1>Progress</h1>
      <p class="progress-subtitle">Your saved quizzes and flashcard study.</p>
      <div id="progress-content"></div>
    </section>
  `;

  const content = root.querySelector('#progress-content');

  function showGuest() {
    content.innerHTML = `
      <div class="progress-guest card">
        <h2>${MESSAGES.guest}</h2>
        <p>Sign in with Google to save your quiz results and flashcard progress.</p>
        <button class="btn btn--primary" id="progress-sign-in" type="button">Sign in with Google</button>
      </div>
    `;
    content.querySelector('#progress-sign-in').addEventListener('click', function () {
      signInWithGoogle().catch(function () {});
    });
  }

  function showData(data) {
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

    let quizHtml = '<li><p>No saved quizzes yet. Take a quiz while signed in.</p></li>';
    if (quizzes.length > 0) {
      quizHtml = '';
    }
    for (let i = 0; i < quizzes.length; i++) {
      const quiz = quizzes[i];
      quizHtml += `
        <li class="progress-row">
          <span class="progress-row-name">${escapeHtml(quiz.category)}</span>
          <span class="progress-row-score">${quiz.percent}%</span>
          <span class="progress-row-detail">${quiz.correct} of ${quiz.total} correct, ${formatDuration(quiz.timeUsedSeconds)}</span>
          <span class="progress-row-detail">${formatDate(quiz.createdAt)}</span>
        </li>
      `;
    }

    let cardsHtml = '<li><p>No flashcard progress yet. Study a deck while signed in.</p></li>';
    if (flashcards.length > 0) {
      cardsHtml = '';
    }
    for (let i = 0; i < flashcards.length; i++) {
      const deck = flashcards[i];
      cardsHtml += `
        <li class="progress-row">
          <span class="progress-row-name">${escapeHtml(deck.category)}</span>
          <span class="progress-row-score">${deck.gotIt || 0} got it</span>
          <span class="progress-row-detail">${deck.reviewAgain || 0} marked review again</span>
          <span class="progress-row-detail">${formatDate(deck.updatedAt)}</span>
        </li>
      `;
    }

    content.innerHTML = `
      <div class="progress-stats">
        <div class="progress-stat">
          <strong>${quizzes.length}</strong>
          <span>Quizzes</span>
        </div>
        <div class="progress-stat">
          <strong>${average}%</strong>
          <span>Average</span>
        </div>
        <div class="progress-stat">
          <strong>${best}%</strong>
          <span>Best</span>
        </div>
      </div>
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
