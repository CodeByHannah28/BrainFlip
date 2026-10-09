import { loadQuestions } from '../api.js';
import { SETTINGS, MESSAGES } from '../config.js';
import { getState, setState, resetQuiz } from '../state.js';
import { goTo } from '../nav.js';
import { escapeHtml, formatClock, getLetter, showLoading, showError } from '../helpers.js';
import { ICONS } from '../icons.js';

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
      <section class="quiz card">
        <h1>Quiz</h1>
        <p>Choose a topic on the home screen to start a quiz.</p>
        <button class="btn btn--primary" id="choose-topic" type="button">Choose a topic</button>
      </section>
    `;
    root.querySelector('#choose-topic').addEventListener('click', function () {
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

  function tick() {
    secondsLeft = secondsLeft - 1;
    setState({ timeUsedSeconds: getState().timeUsedSeconds + 1 });
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

    const answers = state.answers.slice();
    answers[index] = {
      pickedIndex: pickedIndex,
      isCorrect: pickedIndex === question.correctIndex,
      secondsLeft: secondsLeft,
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
      let mark = '';
      if (answer) {
        if (i === question.correctIndex) {
          className = 'quiz-option quiz-option--correct';
          mark = ICONS.check;
        } else if (i === answer.pickedIndex) {
          className = 'quiz-option quiz-option--wrong';
          mark = ICONS.cross;
        }
      }
      let disabled = '';
      if (answer) {
        disabled = 'disabled';
      }

      optionsHtml += `
        <button class="${className}" type="button" data-index="${i}" ${disabled}>
          <span class="quiz-letter">${getLetter(i)}</span>
          <span>${escapeHtml(question.options[i])}</span>
          <span class="quiz-mark">${mark}</span>
        </button>
      `;
    }

    let noteHtml = '';
    if (answer && answer.pickedIndex === -1) {
      noteHtml = '<p class="quiz-note">Time is up. The correct answer is highlighted.</p>';
    }

    let timerText = formatClock(SETTINGS.secondsPerQuestion);
    if (answer) {
      timerText = formatClock(answer.secondsLeft);
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
          <span class="quiz-topic">${escapeHtml(state.selectedCategory.name)}</span>
          <div class="quiz-progress">
            <span>Question ${index + 1} of ${total}</span>
            <div class="quiz-bar">
              <div class="quiz-bar-fill" style="width: ${percent}%"></div>
            </div>
          </div>
          <span class="quiz-timer" id="quiz-timer">${ICONS.clock}<span>${timerText}</span></span>
        </div>

        <h1 class="quiz-question">${escapeHtml(question.question)}</h1>

        <div class="quiz-options">${optionsHtml}</div>
        ${noteHtml}

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
    root.querySelector('#previous-btn').addEventListener('click', goPrevious);
    root.querySelector('#next-btn').addEventListener('click', goNext);

    timerBox = root.querySelector('#quiz-timer');
    if (!answer) {
      secondsLeft = SETTINGS.secondsPerQuestion;
      timerId = setInterval(tick, 1000);
    }
  }

  function handleOptionClick(event) {
    chooseAnswer(Number(event.currentTarget.dataset.index));
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

  const state = getState();
  if (!state.selectedCategory) {
    showNoTopic();
  } else if (state.questions.length > 0 && !state.finished) {
    showQuestion();
  } else {
    startQuiz();
  }

  return function () {
    active = false;
    stopTimer();
  };
}
