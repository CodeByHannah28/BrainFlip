import { loadQuestions } from '../api.js';
import { SETTINGS, MESSAGES } from '../config.js';
import { getState, setState, resetQuiz } from '../state.js';
import { goTo } from '../nav.js';
import { escapeHtml, formatClock, getLetter, showLoading, showError } from '../helpers.js';
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

export function render(root) {
  let active = true;
  let timerId = null;
  let secondsLeft = 0;
  let timerBox = null;

  function stopTimer() {
    clearInterval(timerId);
    timerId = null;
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

    root.innerHTML = `
      <section class="quiz-start">
        <div class="quiz-start-card">
          <span class="quiz-start-icon" style="background: ${data.tile}; color: ${data.color};">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${data.path}</svg>
          </span>
          <p class="quiz-start-kicker">Quiz</p>
          <h1 class="quiz-start-title">${escapeHtml(getTopicLabel(category))}</h1>
          <p class="quiz-start-text">
            Answer each question before the timer runs out. You can go back and change your answers.
          </p>
          <ul class="quiz-start-facts">
            <li class="quiz-start-fact">
              <strong>${state.amount}</strong>
              <span>Questions</span>
            </li>
            <li class="quiz-start-fact">
              <strong>${SETTINGS.secondsPerQuestion}s</strong>
              <span>Per question</span>
            </li>
            <li class="quiz-start-fact">
              <strong>${getDifficultyLabel(state.difficulty)}</strong>
              <span>Difficulty</span>
            </li>
          </ul>
          <div class="quiz-start-actions">
            <button class="btn btn--primary" id="begin-quiz" type="button">
              ${ICONS.play} Start Quiz
            </button>
            <button class="btn btn--outline" id="change-topic" type="button">Change topic</button>
          </div>
        </div>
      </section>
    `;
    root.querySelector('#begin-quiz').addEventListener('click', startQuiz);
    root.querySelector('#change-topic').addEventListener('click', function () {
      goTo('home');
    });
  }

  async function startQuiz() {
    const state = getState();
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
      showQuestion();
    } catch (error) {
      if (active) {
        showError(root, 'Could not load questions', error.message, startQuiz);
      }
    }
  }

  function getRemaining(index) {
    const times = getState().questionTimes || {};
    if (typeof times[index] === 'number') {
      return times[index];
    }
    return SETTINGS.secondsPerQuestion;
  }

  function tick() {
    const current = getState();
    secondsLeft = secondsLeft - 1;
    const times = Object.assign({}, current.questionTimes);
    times[current.currentIndex] = secondsLeft;
    setState({ timeUsedSeconds: current.timeUsedSeconds + 1, questionTimes: times });
    timerBox.lastElementChild.textContent = formatClock(secondsLeft);

    if (secondsLeft <= 10) {
      timerBox.classList.add('quiz-timer--low');
    }
    if (secondsLeft <= 0) {
      chooseAnswer(-1);
    }
  }

  function chooseAnswer(pickedIndex) {
    stopTimer();
    const state = getState();
    const index = state.currentIndex;
    const question = state.questions[index];

    const previous = state.answers[index];
    if (previous && previous.pickedIndex === pickedIndex) {
      return;
    }

    let timeLeft = secondsLeft;
    if (previous) {
      timeLeft = previous.secondsLeft;
    }

    const answers = state.answers.slice();
    answers[index] = {
      pickedIndex: pickedIndex,
      isCorrect: pickedIndex === question.correctIndex,
      secondsLeft: timeLeft,
    };
    setState({ answers: answers });
    showQuestion();
  }

  function showQuestion() {
    stopTimer();
    const state = getState();
    const index = state.currentIndex;
    const total = state.questions.length;
    const question = state.questions[index];
    const answer = state.answers[index];
    const percent = Math.round(((index + 1) / total) * 100);

    let optionsHtml = '';
    for (let i = 0; i < question.options.length; i++) {
      let className = 'quiz-option';
      if (answer && i === answer.pickedIndex) {
        className = 'quiz-option quiz-option--selected';
      }
      let disabled = '';
      if (answer && answer.pickedIndex === -1) {
        disabled = 'disabled';
      }

      optionsHtml += `
        <button class="${className}" type="button" data-index="${i}" ${disabled}>
          <span class="quiz-letter">${getLetter(i)}</span>
          <span>${escapeHtml(question.options[i])}</span>
        </button>
      `;
    }

    let noteHtml = '';
    if (answer && answer.pickedIndex === -1) {
      noteHtml = '<p class="quiz-note">Time is up. No answer was recorded for this question.</p>';
    }

    const remaining = getRemaining(index);
    let timerText = formatClock(remaining);
    if (answer) {
      timerText = formatClock(answer.secondsLeft);
    }

    let dotsHtml = '';
    for (let i = 0; i < total; i++) {
      let dotClass = 'quiz-dot';
      if (i === index) {
        dotClass += ' quiz-dot--current';
      }
      if (state.answers[i]) {
        dotClass += ' quiz-dot--answered';
      }
      let dotDisabled = '';
      if (i > state.answers.length) {
        dotDisabled = 'disabled';
      }
      dotsHtml += `<button class="${dotClass}" type="button" data-jump="${i}" aria-label="Go to question ${i + 1}" ${dotDisabled}>${i + 1}</button>`;
    }

    let nextLabel = 'Next';
    if (index === total - 1) {
      nextLabel = 'Finish';
    }
    let nextDisabled = 'disabled';
    if (answer) {
      nextDisabled = '';
    }
    let previousDisabled = '';
    if (index === 0) {
      previousDisabled = 'disabled';
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
            <span class="quiz-timer" id="quiz-timer">${ICONS.clock}<span>${timerText}</span></span>
          </div>
        </div>

        <div class="quiz-dots">${dotsHtml}</div>

        <h1 class="quiz-question">${escapeHtml(question.question)}</h1>

        <div class="quiz-options">${optionsHtml}</div>
        ${noteHtml}

        <p class="quiz-keys">Tip: press A to D to answer, and the left and right arrow keys to move.</p>

        <div class="quiz-nav">
          <button class="btn btn--outline" id="previous-btn" type="button" ${previousDisabled}>
            ${ICONS.arrowLeft} Previous
          </button>
          <button class="btn btn--primary" id="next-btn" type="button" ${nextDisabled}>
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

    timerBox = root.querySelector('#quiz-timer');
    if (!answer) {
      secondsLeft = remaining;
      if (secondsLeft <= 10) {
        timerBox.classList.add('quiz-timer--low');
      }
      timerId = setInterval(tick, 1000);
    }
  }

  function handleOptionClick(event) {
    chooseAnswer(Number(event.currentTarget.dataset.index));
  }

  function handleDotClick(event) {
    setState({ currentIndex: Number(event.currentTarget.dataset.jump) });
    showQuestion();
  }

  function handleKey(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const state = getState();
    if (state.questions.length === 0 || state.finished || !root.querySelector('.quiz')) {
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
      if (state.answers[index]) {
        goNext();
      }
      return;
    }

    if (state.answers[index] && state.answers[index].pickedIndex === -1) {
      return;
    }
    const key = event.key.toLowerCase();
    let picked = -1;
    if (key >= 'a' && key <= 'z') {
      picked = key.charCodeAt(0) - 97;
    } else if (key >= '1' && key <= '9') {
      picked = Number(key) - 1;
    }
    if (picked >= 0 && picked < state.questions[index].options.length) {
      chooseAnswer(picked);
    }
  }

  function goPrevious() {
    setState({ currentIndex: getState().currentIndex - 1 });
    showQuestion();
  }

  function goNext() {
    const state = getState();
    if (state.currentIndex === state.questions.length - 1) {
      setState({ finished: true });
      goTo('results');
    } else {
      setState({ currentIndex: state.currentIndex + 1 });
      showQuestion();
    }
  }

  document.addEventListener('keydown', handleKey);

  const state = getState();
  if (!state.selectedCategory) {
    showNoTopic();
  } else if (state.questions.length > 0 && !state.finished) {
    showQuestion();
  } else {
    showIntro();
  }

  return function () {
    active = false;
    stopTimer();
    document.removeEventListener('keydown', handleKey);
  };
}