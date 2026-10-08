import { fetchCategories, loadQuestions } from '../api.js';
import { MESSAGES } from '../config.js';
import { getState, setState, recordAnswer } from '../state.js';
import { goTo } from '../nav.js';
import { getTopicData } from '../../data/topics.js';

const STYLESHEET_ID = 'quiz-styles';

const ICONS = {
  check:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  cross:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  clock:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  topic:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
};

function ensureStyles() {
  if (document.getElementById(STYLESHEET_ID)) return;
  const link = document.createElement('link');
  link.id = STYLESHEET_ID;
  link.rel = 'stylesheet';
  link.href = new URL('../../css/screens/quiz.css', import.meta.url).href;
  document.head.appendChild(link);
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

export function render(root) {
  ensureStyles();
  let active = true;
  let timerInterval = null;
  let timeUsedSeconds = 0;
  let autoStartTopic = getState().autoStartTopic;

  root.innerHTML = `
    <div class="quiz-container">
      <h1 hidden>Quiz</h1>
      <form id="quiz-topic-form" hidden>
        <label for="quiz-category">Topic</label>
        <select id="quiz-category" name="category" disabled required>
          <option value="">Loading topics…</option>
        </select>
        <button class="btn btn--primary" type="submit" disabled>Load questions</button>
      </form>
      
      <div class="quiz-message" id="quiz-loading-area" hidden>
        <p id="quiz-status" role="status" aria-live="polite">Loading topics…</p>
        <button class="btn btn--primary" id="quiz-retry" type="button" hidden>Try Again</button>
      </div>

      <div class="quiz-message" id="quiz-empty-area" hidden>
        <h2>No Topic Selected</h2>
        <p>Please choose a topic to start a quiz.</p>
        <button class="btn btn--primary" id="quiz-go-home" type="button">Go to Decks</button>
      </div>

      <section id="quiz-question" aria-live="polite" hidden></section>
    </div>
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
    timeUsedSeconds: 0,
    autoStartTopic: null,
  });

  const select = root.querySelector('#quiz-category');
  const button = root.querySelector('#quiz-topic-form button');
  const status = root.querySelector('#quiz-status');
  const retryButton = root.querySelector('#quiz-retry');
  const loadingArea = root.querySelector('#quiz-loading-area');
  const emptyArea = root.querySelector('#quiz-empty-area');
  const goHomeButton = root.querySelector('#quiz-go-home');
  const questionArea = root.querySelector('#quiz-question');
  let categories = [];

  goHomeButton.addEventListener('click', () => goTo('decks'));

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
    loadingArea.hidden = false;
    status.textContent = MESSAGES.loading;

    try {
      await loadQuestionsForState(category.id);
      if (!active) return;
      startTimer();
      renderQuestionFromState();
    } catch (error) {
      if (!active) return;
      const message =
        error.message === MESSAGES.noQuestions ? MESSAGES.noQuestions : MESSAGES.error;
      setState({ status: 'error', message, source: null, questions: [] });
      questionArea.hidden = true;
      status.textContent = `${message} Check your internet connection, then try again.`;
      retryButton.textContent = 'Try Again';
      retryButton.hidden = false;
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

    // Fetch the dynamic icon data for the active topic
    const topicData = getTopicData(state.topic.id);

    const codeMarkup = question.code
      ? `<pre class="quiz-code"><code>${escapeHtml(question.code)}</code></pre>`
      : '';

    const optionsMarkup = question.options
      .map((option, index) => {
        let stateClass = '';
        let iconMarkup = '';

        if (answerRecord) {
          if (index === answerRecord.correctIndex) {
            stateClass = 'btn--success';
            iconMarkup = `<span class="quiz-option-icon">${ICONS.check}</span>`;
          } else if (index === answerRecord.pickedIndex) {
            stateClass = 'btn--wrong';
            iconMarkup = `<span class="quiz-option-icon">${ICONS.cross}</span>`;
          }
        }

        return `
        <button class="btn btn--outline quiz-option ${stateClass}" data-index="${index}" ${answerRecord ? 'disabled' : ''}>
          <span class="quiz-option-letter">${optionLabels[index]}</span> 
          <span class="quiz-option-text">${escapeHtml(option)}</span>
          ${iconMarkup}
        </button>
      `;
      })
      .join('');

    questionArea.innerHTML = `
      <header class="quiz-header">
        <span class="quiz-topic-label" style="background: ${topicData.tile}; color: ${topicData.color};">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${topicData.path}</svg>
          ${escapeHtml(state.topic.label)}
        </span>
        <span class="quiz-counter">Question ${state.currentIndex + 1} of ${state.questions.length}</span>
        <span class="quiz-timer">
          ${ICONS.clock}
          <span id="quiz-timer-display">${formatTime(timeUsedSeconds)}</span>
        </span>
      </header>

      <div class="quiz-progress-bar" role="progressbar" aria-label="Quiz progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressPercent}">
        <div class="quiz-progress-fill" style="width: ${progressPercent}%;"></div>
      </div>

      <div class="quiz-body">
        <h2 class="quiz-question-text">${escapeHtml(question.question)}</h2>
        ${codeMarkup}
        <div class="quiz-options-grid">
          ${optionsMarkup}
        </div>
      </div>

      <footer class="quiz-footer">
        <button class="btn btn--outline" id="btn-prev" ${state.currentIndex === 0 ? 'disabled' : ''}>&larr; Previous</button>
        <button class="btn btn--primary" id="btn-next" ${!answerRecord ? 'disabled' : ''}>${isLastQuestion ? 'Finish' : 'Next &rarr;'}</button>
      </footer>
    `;

    loadingArea.hidden = true;
    emptyArea.hidden = true;
    questionArea.hidden = false;

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

    questionArea.hidden = true;
    emptyArea.hidden = true;
    loadingArea.hidden = false;

    // Make sure the internal elements of the loading area reset properly
    status.textContent = 'Loading topics…';
    status.hidden = false;
    retryButton.hidden = true;

    try {
      const result = await fetchCategories();
      if (!active) return;
      categories = result;

      if (autoStartTopic) {
        const match = categories.find((item) => Number(item.id) === Number(autoStartTopic.id));
        autoStartTopic = null;
        if (match) {
          select.value = String(match.id);
          fetchAndRenderQuestions(match);
        } else {
          // Fallback if the saved topic ID no longer exists
          loadingArea.hidden = true;
          emptyArea.hidden = false;
        }
      } else {
        // No topic was passed in; strictly show the empty state and hide the loading state
        loadingArea.hidden = true;
        emptyArea.hidden = false;
        setState({ topic: null, status: 'idle', message: '', source: null, questions: [] });
      }
    } catch (error) {
      if (!active) return;
      console.warn('Quiz category loading failed:', error);
      setState({ status: 'error', message: MESSAGES.error, source: null, questions: [] });

      // Keep the loading area visible, but update it to show the error state
      loadingArea.hidden = false;
      emptyArea.hidden = true;
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
