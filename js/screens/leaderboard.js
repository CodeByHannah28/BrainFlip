import { SETTINGS } from '../config.js';
import { getUser, isAuthReady, onUserChange, signInWithGoogle } from '../auth.js';
import { loadTopScores, loadDailyBoard } from '../leaderboard.js';
import { getTodayInfo } from '../daily.js';
import { escapeHtml, formatDuration, showLoading, showError } from '../helpers.js';

export function render(root) {
  let active = true;
  let tab = 'daily';
  let total = SETTINGS.questionsPerQuiz;
  let requestId = 0;

  root.innerHTML = `
    <section class="board">
      <header class="results-header">
        <div>
          <h1>Leaderboard</h1>
          <p class="results-subtitle">See how your scores compare with other players.</p>
        </div>
      </header>
      <div class="board-controls" id="board-controls"></div>
      <div id="board-body"></div>
    </section>
  `;

  const controls = root.querySelector('#board-controls');
  const body = root.querySelector('#board-body');

  function drawControls() {
    let html = `
      <div class="review-tabs">
        <button class="review-tab" id="tab-daily" type="button" aria-pressed="${tab === 'daily'}">Daily Challenge</button>
        <button class="review-tab" id="tab-quizzes" type="button" aria-pressed="${tab === 'quizzes'}">Quizzes</button>
      </div>
    `;

    if (tab === 'quizzes') {
      let sizeButtons = '';
      for (let i = 0; i < SETTINGS.amountOptions.length; i++) {
        const amount = SETTINGS.amountOptions[i];
        sizeButtons += `<button class="review-tab" type="button" data-total="${amount}" aria-pressed="${amount === total}">${amount} questions</button>`;
      }
      html += `<div class="review-tabs">${sizeButtons}</div>`;
    }

    controls.innerHTML = html;

    controls.querySelector('#tab-daily').addEventListener('click', function () {
      tab = 'daily';
      draw();
    });
    controls.querySelector('#tab-quizzes').addEventListener('click', function () {
      tab = 'quizzes';
      draw();
    });
    const sizes = controls.querySelectorAll('[data-total]');
    for (let i = 0; i < sizes.length; i++) {
      sizes[i].addEventListener('click', function (event) {
        total = Number(event.currentTarget.dataset.total);
        draw();
      });
    }
  }

  function rowHtml(row, rank, myUid) {
    const isMe = row.uid === myUid;
    let className = 'board-row';
    if (isMe) {
      className += ' board-row--me';
    }
    if (rank <= 3) {
      className += ' board-row--top';
    }
    let youHtml = '';
    if (isMe) {
      youHtml = '<span class="board-you">You</span>';
    }
    return `
      <li class="${className}">
        <span class="board-rank">${rank}</span>
        <span class="board-name"><span class="board-name-text">${escapeHtml(row.name)}</span>${youHtml}</span>
        <span class="board-score">${row.correct}/${row.total}</span>
        <span class="board-time">${formatDuration(row.time)}</span>
      </li>
    `;
  }

  function showSignIn() {
    body.innerHTML = `
      <div class="board-signin card">
        <h2 class="board-heading">Sign in to see the leaderboard</h2>
        <p class="board-empty">Sign in with Google to see other players and add your own scores.</p>
        <button class="btn btn--primary" id="board-signin" type="button">Sign in with Google</button>
      </div>
    `;
    body.querySelector('#board-signin').addEventListener('click', function () {
      signInWithGoogle().catch(function () {});
    });
  }

  function showRows(rows, heading, emptyText) {
    const user = getUser();
    let listHtml = '';
    for (let i = 0; i < rows.length; i++) {
      listHtml += rowHtml(rows[i], i + 1, user.uid);
    }
    if (rows.length === 0) {
      listHtml = `<li><p class="board-empty">${escapeHtml(emptyText)}</p></li>`;
    }
    body.innerHTML = `
      <h2 class="board-heading">${escapeHtml(heading)}</h2>
      <ol class="board-list">${listHtml}</ol>
    `;
  }

  async function draw() {
    drawControls();

    if (!isAuthReady()) {
      showLoading(body, 'Loading...');
      return;
    }
    if (!getUser()) {
      showSignIn();
      return;
    }

    requestId++;
    const current = requestId;
    showLoading(body, 'Loading the leaderboard...');

    try {
      let rows = [];
      let heading = '';
      let emptyText = '';
      if (tab === 'daily') {
        const info = getTodayInfo();
        rows = await loadDailyBoard(info.id);
        heading = info.name + ' (today)';
        emptyText = 'No one has finished today\'s challenge yet. Be the first!';
      } else {
        rows = await loadTopScores(total);
        heading = 'Top scores for ' + total + '-question quizzes';
        emptyText = 'No scores yet for ' + total + '-question quizzes. Finish one to appear here.';
      }
      if (!active || current !== requestId) {
        return;
      }
      showRows(rows, heading, emptyText);
    } catch (error) {
      console.error(error);
      if (active && current === requestId) {
        showError(
          body,
          'Could not load the leaderboard',
          'The leaderboard may still be getting set up. Please try again later.',
          draw,
        );
      }
    }
  }

  const stopListening = onUserChange(function () {
    draw();
  });

  draw();

  return function () {
    active = false;
    stopListening();
  };
}