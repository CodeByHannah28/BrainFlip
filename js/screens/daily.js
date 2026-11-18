import { SETTINGS, MESSAGES } from '../config.js';
import { getUser, isAuthReady, onUserChange, signInWithGoogle } from '../auth.js';
import { resetQuiz, setState } from '../state.js';
import { goTo } from '../nav.js';
import {
  getTodayInfo,
  getHoursUntilNext,
  fetchChallenge,
  getEntry,
  forfeitDaily,
  wasDailyStarted,
  getStreak,
  recordDailyStreak,
} from '../daily.js';
import { escapeHtml, formatDuration, showLoading, showError } from '../helpers.js';
import { ICONS } from '../icons.js';
import { getTopicData } from '../../data/topics.js';
import { topicIconHtml } from '../topic-icon.js';

export function render(root) {
  let active = true;
  let requestId = 0;
  const info = getTodayInfo();

  function showSignIn() {
    root.innerHTML = `
      <section class="daily">
        <header class="results-header">
          <div>
            <h1>Daily Challenge</h1>
            <p class="results-subtitle">One new challenge every day. Play to build your streak.</p>
          </div>
        </header>
        <div class="board-signin card">
          <span class="streak-flame">${ICONS.flame}</span>
          <h2 class="board-heading">Sign in to play</h2>
          <p class="board-empty">Daily challenges, streaks and the leaderboard need a Google account.</p>
          <button class="btn btn--primary" id="daily-signin" type="button">Sign in with Google</button>
        </div>
      </section>
    `;
    root.querySelector('#daily-signin').addEventListener('click', function () {
      signInWithGoogle().catch(function () {});
    });
  }

  function showPage(entry, streak, forfeited) {
    const data = getTopicData(info.category.id);
    const playedToday = streak.lastPlayedDate === info.id;
    const totalSeconds = info.total * SETTINGS.secondsPerQuestion;
    const dateText = new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });

    let streakText = 'Finish today\'s challenge to start a streak.';
    if (playedToday) {
      streakText = 'Streak locked in for today. Come back tomorrow to keep it going.';
    } else if (streak.current > 0) {
      streakText = 'Play today\'s challenge to keep your streak alive.';
    }
    let flameClass = 'streak-flame';
    if (streak.current > 0) {
      flameClass = 'streak-flame streak-flame--lit';
    }
    let dayWord = 'days';
    if (streak.current === 1) {
      dayWord = 'day';
    }

    let statusHtml = '';
    let actionsHtml = '';
    if (entry) {
      let message = 'Come back tomorrow for a new challenge. It arrives in about ' + getHoursUntilNext() + ' hours.';
      if (forfeited) {
        message = 'You left the challenge before finishing, so today\'s attempt was used. A new challenge arrives in about ' + getHoursUntilNext() + ' hours.';
      }
      statusHtml = `
        <div class="daily-result">
          <strong>${entry.correct} / ${entry.total}</strong>
          <span>in ${formatDuration(entry.timeUsedSeconds)}</span>
        </div>
        <p class="daily-message">${escapeHtml(message)}</p>
      `;
      actionsHtml = `
        <button class="btn btn--primary" id="daily-board" type="button">
          ${ICONS.trophy} View leaderboard
        </button>
      `;
    } else {
      statusHtml = '<p class="daily-message">You can play today\'s challenge once. Make it count!</p>';
      actionsHtml = `
        <button class="btn btn--primary" id="daily-play" type="button">
          ${ICONS.play} Start today's challenge
        </button>
        <button class="btn btn--outline" id="daily-board" type="button">
          ${ICONS.trophy} View leaderboard
        </button>
      `;
    }

    root.innerHTML = `
      <section class="daily">
        <header class="results-header">
          <div>
            <h1>Daily Challenge</h1>
            <p class="results-subtitle">One new challenge every day. Play to build your streak.</p>
          </div>
        </header>

        <div class="streak card">
          <span class="${flameClass}">${ICONS.flame}</span>
          <div class="streak-text">
            <strong class="streak-count">${streak.current} ${dayWord} streak</strong>
            <span class="streak-best">Best streak: ${streak.longest} ${streak.longest === 1 ? 'day' : 'days'}</span>
            <span class="streak-hint">${escapeHtml(streakText)}</span>
          </div>
        </div>

        <div class="daily-card card">
          <p class="daily-date">${escapeHtml(dateText)}</p>
          <h2 class="daily-name">${escapeHtml(info.name)}</h2>
          <p class="daily-topic">
            ${topicIconHtml(info.category.id, 26)}
            <span>${escapeHtml(info.category.name)}</span>
          </p>
          <ul class="quiz-start-facts">
            <li class="quiz-start-fact">
              <strong>${info.total}</strong>
              <span>Questions</span>
            </li>
            <li class="quiz-start-fact">
              <strong>${formatDuration(totalSeconds)}</strong>
              <span>Total time</span>
            </li>
            <li class="quiz-start-fact">
              <strong style="color: ${data.color};">1</strong>
              <span>Attempt</span>
            </li>
          </ul>
          ${statusHtml}
          <div class="daily-actions">${actionsHtml}</div>
        </div>
      </section>
    `;

    const playButton = root.querySelector('#daily-play');
    if (playButton) {
      playButton.addEventListener('click', play);
    }
    root.querySelector('#daily-board').addEventListener('click', function () {
      goTo('leaderboard');
    });
  }

  async function play() {
    showLoading(root, 'Getting today\'s challenge...');
    try {
      const challenge = await fetchChallenge();
      if (!active) {
        return;
      }
      resetQuiz();
      setState({
        selectedCategory: challenge.category,
        difficulty: '',
        amount: challenge.questions.length,
        mode: 'daily',
        dailyId: challenge.id,
        dailyName: challenge.name,
        questions: challenge.questions,
      });
      goTo('quiz');
    } catch (error) {
      console.error(error);
      if (active) {
        showError(root, 'Could not load the challenge', MESSAGES.error, play);
      }
    }
  }

  async function load() {
    if (!isAuthReady()) {
      showLoading(root, MESSAGES.loading);
      return;
    }
    if (!getUser()) {
      showSignIn();
      return;
    }

    requestId++;
    const current = requestId;
    showLoading(root, MESSAGES.loading);

    try {
      let entry = await getEntry(info.id);
      let forfeited = false;
      if (!entry && wasDailyStarted(info.id)) {
        await forfeitDaily(info);
        entry = await getEntry(info.id);
        forfeited = true;
      }

      let streak = await getStreak();
      if (entry && !forfeited && entry.correct > 0 && streak.lastPlayedDate !== info.id) {
        try {
          await recordDailyStreak();
          streak = await getStreak();
        } catch (error) {
          console.error(error);
        }
      }

      if (!active || current !== requestId) {
        return;
      }
      showPage(entry, streak, forfeited);
    } catch (error) {
      console.error(error);
      if (active && current === requestId) {
        showError(
          root,
          'Could not load the daily challenge',
          'Check your connection and try again. If this keeps happening, the app may still be getting set up.',
          load,
        );
      }
    }
  }

  const stopListening = onUserChange(function () {
    load();
  });

  load();

  return function () {
    active = false;
    stopListening();
  };
}