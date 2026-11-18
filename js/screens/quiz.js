import { loadQuestions } from '../api.js';
import { SETTINGS, MESSAGES } from '../config.js';
import { getState, setState, resetQuiz } from '../state.js';
import { goTo } from '../nav.js';
import { askToSubmit, showTabWarning } from '../confirm.js';
import { getQuizRules, rulesHtml, bindRules } from '../rules.js';
import { markDailyStarted } from '../daily.js';
import {
  escapeHtml,
  formatClock,
  formatDuration,
  getLetter,
  showLoading,
  showError,
} from '../helpers.js';
import { ICONS } from '../icons.js';
import { TOPICS, getTopicData } from '../../data/topics.js';
import { topicIconHtml } from '../topic-icon.js';

function getTopicLabel(category) {
  for (let i = 0; i < TOPICS.length; i++) {
    if (TOPICS[i].id === category.id) {
      return TOPICS[i].label;
    }
  }
  return category.name;
}

function getDifficultyLabel(value) {
  if (!value) {
    return 'Any';
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const MAX_AWAY_MS = 60 * 1000;

function countAnswered(state) {
  let count = 0;
  for (let i = 0; i < state.questions.length; i++) {
    if (state.answers[i]) {
      count++;
    }
  }
  return count;
}

export function render(root) {
  let active = true;
  let clockId = null;
  let hiddenAt = 0;

  function stopClock() {
    clearInterval(clockId);
    clockId = null;
  }

  function getSecondsLeft() {
    const left = Math.ceil((getState().quizEndsAt - Date.now()) / 1000);
    return Math.max(0, left);
  }

  function isRunning() {
    const state = getState();
    return state.quizStartedAt > 0 && !state.finished && state.questions.length > 0;
  }

  function startClock() {
    const state = getState();
    if (state.quizStartedAt === 0) {
      const now = Date.now();
      const limit = state.questions.length * SETTINGS.secondsPerQuestion;
      setState({ quizLimit: limit, quizStartedAt: now, quizEndsAt: now + limit * 1000 });
    }
    stopClock();
    clockId = setInterval(updateClock, 250);
  }

  function updateClock() {
    if (!isRunning()) {
      stopClock();
      return;
    }
    const left = getSecondsLeft();
    const text = root.querySelector('#quiz-timer-text');
    if (text) {
      text.textContent = formatClock(left);
    }
    const box = root.querySelector('#quiz-timer');
    if (box) {
      box.classList.toggle('quiz-timer--low', left <= 30);
    }
    if (left <= 0) {
      finishQuiz('time');
    }
  }

  function ensureTime() {
    if (getSecondsLeft() <= 0) {
      finishQuiz('time');
      return false;
    }
    return true;
  }

  function finishQuiz(reason) {
    const state = getState();
    if (state.finished || state.quizStartedAt === 0) {
      return;
    }
    stopClock();

    let used = Math.round((Date.now() - state.quizStartedAt) / 1000);
    if (reason === 'time') {
      used = state.quizLimit;
    }
    used = Math.min(used, state.quizLimit);

    setState({ finished: true, endReason: reason, timeUsedSeconds: used });

    const openDialogs = document.querySelectorAll('dialog.confirm-dialog[open]');
    for (let i = 0; i < openDialogs.length; i++) {
      openDialogs[i].close();
    }
    goTo('results');
  }

  function showNoTopic() {
    root.innerHTML = `
      <section class="review review-empty">
        <div class="review-empty-card">
          <span class="review-empty-icon">${ICONS.clock}</span>
          <p class="review-empty-kicker">Quiz</p>
          <h1 class="review-empty-title">Choose a topic</h1>
          <p class="review-empty-text">
            Pick a topic on the home screen first, then answer timed questions and see how well you know it.
          </p>
          <ol class="review-empty-steps">
            <li class="review-empty-step"><strong>1</strong><span>Choose a topic</span></li>
            <li class="review-empty-step"><strong>2</strong><span>Take the quiz</span></li>
            <li class="review-empty-step"><strong>3</strong><span>See your score</span></li>
          </ol>
          <div class="review-empty-actions review-empty-actions--single">
            <button class="btn btn--primary" id="choose-topic" type="button">
              ${ICONS.play} Choose a topic
            </button>
          </div>
        </div>
      </section>
    `;
    root.querySelector('#choose-topic').addEventListener('click', function () {
      goTo('home');
    });
  }

  function showIntro() {
    const state = getState();
    const category = state.selectedCategory;
    const data = getTopicData(category.id);
    const isDaily = state.mode === 'daily';

    let amount = state.amount;
    if (isDaily && state.questions.length > 0) {
      amount = state.questions.length;
    }
    const totalSeconds = amount * SETTINGS.secondsPerQuestion;

    let kicker = 'Quiz';
    let title = getTopicLabel(category);
    let text =
      'Answer as many questions as you can before the timer runs out. You can skip questions and come back to them.';
    if (isDaily) {
      kicker = 'Daily Challenge';
      title = state.dailyName;
      text =
        getTopicLabel(category) +
        ' questions. Everyone gets the same questions today, and you can play once.';
    }

    root.innerHTML = `
      <section class="quiz-start">
        <div class="quiz-start-card">
          <span class="quiz-start-icon" style="background: ${data.tile}; color: ${data.color};">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${data.path}</svg>
          </span>
          <p class="quiz-start-kicker">${kicker}</p>
          <h1 class="quiz-start-title">${escapeHtml(title)}</h1>
          <p class="quiz-start-text">${escapeHtml(text)}</p>
          <ul class="quiz-start-facts">
            <li class="quiz-start-fact">
              <strong>${amount}</strong>
              <span>Questions</span>
            </li>
            <li class="quiz-start-fact">
              <strong>${formatDuration(totalSeconds)}</strong>
              <span>Total time</span>
            </li>
            <li class="quiz-start-fact">
              <strong>${getDifficultyLabel(state.difficulty)}</strong>
              <span>Difficulty</span>
            </li>
          </ul>
          ${rulesHtml(getQuizRules(amount, isDaily))}
          <div class="quiz-start-actions">
            <button class="btn btn--primary" id="begin-quiz" type="button" disabled>
              ${ICONS.play} Start Quiz
            </button>
            <button class="btn btn--outline" id="change-topic" type="button">Change topic</button>
          </div>
        </div>
      </section>
    `;
    const beginButton = root.querySelector('#begin-quiz');
    bindRules(root, beginButton);
    beginButton.addEventListener('click', startQuiz);
    root.querySelector('#change-topic').addEventListener('click', function () {
      goTo('home');
    });
  }

  async function startQuiz() {
    const state = getState();

    if (state.mode === 'daily' && state.questions.length > 0 && state.quizStartedAt === 0) {
      markDailyStarted(state.dailyId);
      startClock();
      showQuestion();
      return;
    }

    resetQuiz();
    showLoading(root, MESSAGES.loading);

    try {
      const questions = await loadQuestions(
        state.selectedCategory.id,
        state.amount,
        state.difficulty,
      );
      if (!active) {
        return;
      }
      setState({ questions: questions });
      startClock();
      showQuestion();
    } catch (error) {
      if (active) {
        showError(root, 'Could not load questions', error.message, startQuiz);
      }
    }
  }

  function chooseAnswer(pickedIndex) {
    if (!isRunning() || !ensureTime()) {
      return;
    }
    const state = getState();
    const index = state.currentIndex;
    const previous = state.answers[index];
    if (previous && previous.pickedIndex === pickedIndex) {
      return;
    }

    const answers = state.answers.slice();
    answers[index] = {
      pickedIndex: pickedIndex,
      isCorrect: pickedIndex === state.questions[index].correctIndex,
    };
    setState({ answers: answers });
    showQuestion();
  }

  function showQuestion() {
    const state = getState();
    const index = state.currentIndex;
    const total = state.questions.length;
    const question = state.questions[index];
    const answer = state.answers[index];
    const percent = Math.round(((index + 1) / total) * 100);
    const answeredCount = countAnswered(state);

    let optionsHtml = '';
    for (let i = 0; i < question.options.length; i++) {
      let className = 'quiz-option';
      if (answer && i === answer.pickedIndex) {
        className = 'quiz-option quiz-option--selected';
      }

      optionsHtml += `
        <button class="${className}" type="button" data-index="${i}">
          <span class="quiz-letter">${getLetter(i)}</span>
          <span>${escapeHtml(question.options[i])}</span>
        </button>
      `;
    }

    let dotsHtml = '';
    for (let i = 0; i < total; i++) {
      let dotClass = 'quiz-dot';
      let status = 'not answered';
      if (i === index) {
        dotClass += ' quiz-dot--current';
      }
      if (state.answers[i]) {
        dotClass += ' quiz-dot--answered';
        status = 'answered';
      }
      dotsHtml += `<button class="${dotClass}" type="button" data-jump="${i}" aria-label="Go to question ${i + 1}, ${status}">${i + 1}</button>`;
    }

    let nextLabel = 'Next';
    if (index === total - 1) {
      nextLabel = 'Finish';
    }
    let previousDisabled = '';
    if (index === 0) {
      previousDisabled = 'disabled';
    }

    const left = getSecondsLeft();
    let timerClass = 'quiz-timer';
    if (left <= 30) {
      timerClass = 'quiz-timer quiz-timer--low';
    }

    root.innerHTML = `
      <section class="quiz card">
        <div class="quiz-top">
          <span class="quiz-topic">${topicIconHtml(state.selectedCategory.id, 26)}<span class="quiz-topic-name">${escapeHtml(state.selectedCategory.name)}</span></span>
          <div class="quiz-progress">
            <span>Question ${index + 1} of ${total}</span>
            <div class="quiz-bar">
              <div class="quiz-bar-fill" style="width: ${percent}%"></div>
            </div>
          </div>
          <div class="quiz-meta">
            <span class="${timerClass}" id="quiz-timer">${ICONS.clock}<span id="quiz-timer-text">${formatClock(left)}</span></span>
          </div>
        </div>

        <div class="quiz-dots">${dotsHtml}</div>
        <p class="quiz-count">${answeredCount} of ${total} answered</p>

        <h1 class="quiz-question">${escapeHtml(question.question)}</h1>

        <div class="quiz-options">${optionsHtml}</div>

        <p class="quiz-keys">Tip: press A to D to answer, and the left and right arrow keys to move. You can skip a question and come back to it.</p>

        <div class="quiz-nav">
          <button class="btn btn--outline" id="previous-btn" type="button" ${previousDisabled}>
            ${ICONS.arrowLeft} Previous
          </button>
          <button class="btn btn--primary" id="next-btn" type="button">
            ${nextLabel} ${ICONS.arrowRight}
          </button>
        </div>
      </section>
    `;

    const optionButtons = root.querySelectorAll('.quiz-option');
    for (let i = 0; i < optionButtons.length; i++) {
      optionButtons[i].addEventListener('click', handleOptionClick);
    }
    const dotButtons = root.querySelectorAll('.quiz-dot');
    for (let i = 0; i < dotButtons.length; i++) {
      dotButtons[i].addEventListener('click', handleDotClick);
    }
    root.querySelector('#previous-btn').addEventListener('click', goPrevious);
    root.querySelector('#next-btn').addEventListener('click', goNext);
  }

  function handleOptionClick(event) {
    chooseAnswer(Number(event.currentTarget.dataset.index));
  }

  function handleDotClick(event) {
    if (!isRunning() || !ensureTime()) {
      return;
    }
    setState({ currentIndex: Number(event.currentTarget.dataset.jump) });
    showQuestion();
  }

  function handleKey(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (document.querySelector('dialog[open]')) {
      return;
    }
    const state = getState();
    if (!isRunning() || !root.querySelector('.quiz')) {
      return;
    }
    const index = state.currentIndex;

    if (event.key === 'ArrowLeft') {
      if (index > 0) {
        goPrevious();
      }
      return;
    }
    if (event.key === 'ArrowRight') {
      if (index < state.questions.length - 1) {
        goNext();
      }
      return;
    }

    const key = event.key.toLowerCase();
    let picked = -1;
    if (key.length === 1 && key >= 'a' && key <= 'z') {
      picked = key.charCodeAt(0) - 97;
    } else if (key.length === 1 && key >= '1' && key <= '9') {
      picked = Number(key) - 1;
    }
    if (picked >= 0 && picked < state.questions[index].options.length) {
      chooseAnswer(picked);
    }
  }

  function goPrevious() {
    if (!isRunning() || !ensureTime()) {
      return;
    }
    const state = getState();
    if (state.currentIndex === 0) {
      return;
    }
    setState({ currentIndex: state.currentIndex - 1 });
    showQuestion();
  }

  function goNext() {
    if (!isRunning() || !ensureTime()) {
      return;
    }
    const state = getState();
    if (state.currentIndex < state.questions.length - 1) {
      setState({ currentIndex: state.currentIndex + 1 });
      showQuestion();
      return;
    }
    submitQuiz();
  }

  function submitQuiz() {
    const state = getState();
    const unanswered = state.questions.length - countAnswered(state);
    if (unanswered === 0) {
      finishQuiz('submitted');
      return;
    }
    askToSubmit(unanswered).then(function (submit) {
      if (submit && !getState().finished) {
        finishQuiz('submitted');
      }
    });
  }

  function handleVisibility() {
    if (!isRunning()) {
      return;
    }
    const state = getState();

    if (document.hidden) {
      hiddenAt = Date.now();
      const warnings = state.warnings + 1;
      setState({ warnings: warnings, warningSeen: false });
      if (warnings >= 2) {
        finishQuiz('tab');
      }
      return;
    }

    let awayMs = 0;
    if (hiddenAt > 0) {
      awayMs = Date.now() - hiddenAt;
    }
    hiddenAt = 0;

    if (awayMs > MAX_AWAY_MS) {
      finishQuiz('away');
      return;
    }
    if (getSecondsLeft() <= 0) {
      finishQuiz('time');
      return;
    }
    if (state.warnings === 1 && !state.warningSeen) {
      setState({ warningSeen: true });
      showTabWarning();
    }
  }

  document.addEventListener('keydown', handleKey);
  document.addEventListener('visibilitychange', handleVisibility);

  const state = getState();
  if (!state.selectedCategory) {
    showNoTopic();
  } else if (state.mode === 'daily' && (state.finished || state.questions.length === 0)) {
    goTo('daily');
  } else if (state.questions.length > 0 && !state.finished && state.quizStartedAt > 0) {
    if (getSecondsLeft() <= 0) {
      finishQuiz('time');
    } else {
      startClock();
      showQuestion();
    }
  } else {
    showIntro();
  }

  return function () {
    active = false;
    stopClock();
    document.removeEventListener('keydown', handleKey);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}