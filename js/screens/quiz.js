import { fetchCategories, loadQuestions } from '../api.js';
import { MESSAGES } from '../config.js';
import { getState, setState, recordAnswer } from '../state.js';
import { goTo } from '../nav.js';

export function render(root) {
  let active = true;
  let timerInterval = null;
  let timeUsedSeconds = 0;

  root.innerHTML = `
    <h1>Quiz</h1>
    <p>Select a topic from Open Trivia DB to load quiz questions.</p>
    <form id="quiz-topic-form">
      <label for="quiz-category">Topic</label>
      <select id="quiz-category" name="category" disabled required>
        <option value="">Loading topics…</option>
      </select>
      <button class="btn btn--primary" type="submit" disabled>Load questions</button>
    </form>
    <p id="quiz-status" role="status" aria-live="polite">Loading topics…</p>
    <button class="btn btn--outline" id="quiz-retry" type="button" hidden>Try Again</button>
    <section id="quiz-question" class="card" aria-live="polite" hidden></section>
  `;

  setState({
    topic: null,
    status: 'idle',
    message: '',
    source: null,
    questions: [],
    currentIndex: 0,
    answers: [],
    score: 0,
    finished: false,
  });

  const form = root.querySelector('#quiz-topic-form');
  const select = root.querySelector('#quiz-category');
  const button = form.querySelector('button');
  const status = root.querySelector('#quiz-status');
  const retryButton = root.querySelector('#quiz-retry');
  const questionArea = root.querySelector('#quiz-question');
  let categories = [];

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const category = categories.find((item) => String(item.id) === select.value);
    if (category) fetchAndRenderQuestions(category);
  });

  retryButton.addEventListener('click', () => {
    const { topic, status: currentStatus } = getState();
    if (currentStatus === 'error' && topic) {
      const category = categories.find((item) => item.id === topic.id);
      if (category) fetchAndRenderQuestions(category);
    } else {
      loadCategoryList();
    }
  });

  function startTimer() {
    timeUsedSeconds = 0;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!active) return clearInterval(timerInterval);
      timeUsedSeconds++;
      const timerDisplay = document.getElementById('quiz-timer-display');
      if (timerDisplay) timerDisplay.textContent = formatTime(timeUsedSeconds);
    }, 1000);
  }

  async function fetchAndRenderQuestions(category) {
    setState({
      topic: { id: category.id, label: category.name },
      status: 'loading',
      message: MESSAGES.loading,
      source: null,
      questions: [],
      currentIndex: 0,
      answers: [],
      score: 0,
    });

    questionArea.hidden = true;
    retryButton.hidden = true;
    select.disabled = true;
    button.disabled = true;
    status.textContent = MESSAGES.loading;

    try {
      await loadQuestionsForState(category.id);
      if (!active) return;

      startTimer();
      renderQuestionFromState();

      select.disabled = false;
      button.disabled = false;
    } catch (error) {
      if (!active) return;
      const message =
        error.message === MESSAGES.noQuestions ? MESSAGES.noQuestions : MESSAGES.error;
      setState({ status: 'error', message, source: null, questions: [] });
      questionArea.hidden = true;
      status.textContent = `${message} Check your internet connection, then try again.`;
      retryButton.textContent = 'Try Again';
      retryButton.hidden = false;
      select.disabled = false;
      button.disabled = false;
    }
  }

  async function loadQuestionsForState(categoryId) {
    const questions = await loadQuestions(categoryId);
    if (!active) return;
    setState({ status: 'ready', message: '', source: 'api', questions });
  }

  function renderQuestionFromState() {
    const state = getState();
    if (state.status !== 'ready' || state.questions.length === 0) return;

    const question = state.questions[state.currentIndex];
    const answerRecord = state.answers.find((a) => a.questionId === question.id);
    const isLastQuestion = state.currentIndex === state.questions.length - 1;
    const progressPercent = ((state.currentIndex + 1) / state.questions.length) * 100;
    const optionLabels = ['A', 'B', 'C', 'D'];

    const codeMarkup = question.code
      ? `<pre class="quiz-code"><code>${escapeHtml(question.code)}</code></pre>`
      : '';

  const optionsMarkup = question.options
    .map((option, index) => {
      let stateClass = '';

      if (answerRecord) {
        if (index === answerRecord.correctIndex) {
          stateClass = 'btn--success';
        } else if (index === answerRecord.pickedIndex) {
          stateClass = 'btn--wrong';
        }
      }

      return `
        <button class="btn btn--outline quiz-option ${stateClass}" data-index="${index}" ${answerRecord ? 'disabled' : ''} style="display: flex; width: 100%; justify-content: flex-start; text-align: left; margin-bottom: var(--space-3);">
          <strong style="margin-right: var(--space-3);">${optionLabels[index]}</strong> 
          <span>${escapeHtml(option)}</span>
        </button>
      `;
    })
    .join('');

    questionArea.innerHTML = `
      <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
        <span class="quiz-topic-label" style="font-weight: bold; color: var(--color-brand);">${escapeHtml(state.topic.label)}</span>
        <span>Question ${state.currentIndex + 1} of ${state.questions.length}</span>
        <span class="quiz-timer" id="quiz-timer-display" style="background: var(--color-timer-bg); color: var(--color-timer-text); padding: var(--space-1) var(--space-3); border-radius: var(--radius-pill); font-weight: bold;">
          ${formatTime(timeUsedSeconds)}
        </span>
      </header>

      <div class="progress-bar" style="width: 100%; height: 8px; background: var(--color-border); border-radius: var(--radius-pill); margin-bottom: var(--space-5);">
        <div class="progress-fill" style="width: ${progressPercent}%; height: 100%; background: var(--color-brand); border-radius: var(--radius-pill); transition: width var(--duration) ease;"></div>
      </div>

      <div class="quiz-body">
        <h2 style="margin-bottom: var(--space-5);">${escapeHtml(question.question)}</h2>
        ${codeMarkup}
        <div class="quiz-options-grid">
          ${optionsMarkup}
        </div>
      </div>

      <footer style="display: flex; justify-content: space-between; margin-top: var(--space-5);">
        <button class="btn btn--outline" id="btn-prev" ${state.currentIndex === 0 ? 'disabled' : ''}>&larr; Previous</button>
        <button class="btn btn--primary" id="btn-next" ${!answerRecord ? 'disabled' : ''}>${isLastQuestion ? 'Finish' : 'Next &rarr;'}</button>
      </footer>
    `;

    questionArea.hidden = false;
    status.textContent = `Showing question ${state.currentIndex + 1} of ${state.questions.length}.`;
    retryButton.hidden = true;

    if (!answerRecord) {
      questionArea.querySelectorAll('.quiz-option').forEach((btn) => {
        btn.addEventListener('click', () => {
          const pickedIndex = parseInt(btn.dataset.index, 10);
          recordAnswer({
            questionId: question.id,
            pickedIndex,
            correctIndex: question.correctIndex,
          });
          renderQuestionFromState();
        });
      });
    }

    questionArea.querySelector('#btn-prev').addEventListener('click', () => {
      if (state.currentIndex > 0) {
        setState({ currentIndex: state.currentIndex - 1 });
        renderQuestionFromState();
      }
    });

    questionArea.querySelector('#btn-next').addEventListener('click', () => {
      if (isLastQuestion) {
        clearInterval(timerInterval);
        setState({ timeUsedSeconds, finished: true });
        goTo('results');
      } else {
        setState({ currentIndex: state.currentIndex + 1 });
        renderQuestionFromState();
      }
    });
  }

  async function loadCategoryList() {
    setState({
      topic: null,
      status: 'loading',
      message: 'Loading topics…',
      source: null,
      questions: [],
    });
    select.disabled = true;
    button.disabled = true;
    retryButton.hidden = true;
    questionArea.hidden = true;
    status.textContent = 'Loading topics…';

    try {
      const result = await fetchCategories();
      if (!active) return;
      categories = result;
      select.innerHTML =
        '<option value="">Choose a topic</option>' +
        result
          .map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`)
          .join('');
      select.disabled = false;
      button.disabled = false;
      setState({ topic: null, status: 'idle', message: '', source: null, questions: [] });
      status.textContent = 'Choose a topic to load questions.';
    } catch (error) {
      if (!active) return;
      console.warn('Quiz category loading failed:', error);
      setState({ status: 'error', message: MESSAGES.error, source: null, questions: [] });
      select.innerHTML = '<option value="">Topics could not be loaded</option>';
      status.textContent = `${MESSAGES.error} Check your internet connection and try again.`;
      retryButton.textContent = 'Reload topics';
      retryButton.hidden = false;
    }
  }

  loadCategoryList();

  return () => {
    active = false;
    clearInterval(timerInterval);
  };
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

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
