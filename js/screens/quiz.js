import { fetchCategories, loadQuestions } from '../api.js';
import { MESSAGES } from '../config.js';
import { getState, setState } from '../state.js';

export function render(root) {
  let active = true;
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

  // A new visit starts a fresh category-selection flow.
  setState({ topic: null, status: 'idle', message: '', source: null, questions: [], currentIndex: 0 });

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

  async function fetchAndRenderQuestions(category) {
    setState({
      topic: { id: category.id, label: category.name },
      status: 'loading',
      message: MESSAGES.loading,
      source: null,
      questions: [],
      currentIndex: 0,
    });
    questionArea.hidden = true;
    retryButton.hidden = true;
    select.disabled = true;
    button.disabled = true;
    status.textContent = MESSAGES.loading;

    try {
      await loadQuestionsForState(category.id);
      if (!active) return;
      renderQuestionFromState();
      select.disabled = false;
      button.disabled = false;
    } catch (error) {
      if (!active) return;
      const message = error.message === MESSAGES.noQuestions ? MESSAGES.noQuestions : MESSAGES.error;
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
    const codeMarkup = question.code
      ? `<pre class="quiz-code"><code>${escapeHtml(question.code)}</code></pre>`
      : '';

    questionArea.innerHTML = `
      <p>Question ${state.currentIndex + 1} of ${state.questions.length}</p>
      <h2>${escapeHtml(question.question)}</h2>
      ${codeMarkup}
      <ol class="quiz-options">
        ${question.options.map((option) => `<li>${escapeHtml(option)}</li>`).join('')}
      </ol>
    `;
    questionArea.hidden = false;
    status.textContent = `${state.questions.length} questions loaded for ${state.topic.label}.`;
    retryButton.hidden = true;
  }

  async function loadCategoryList() {
    setState({ topic: null, status: 'loading', message: 'Loading topics…', source: null, questions: [] });
    select.disabled = true;
    button.disabled = true;
    retryButton.hidden = true;
    questionArea.hidden = true;
    status.textContent = 'Loading topics…';

    try {
      const result = await fetchCategories();
      if (!active) return;
      categories = result;
      select.innerHTML = '<option value="">Choose a topic</option>' + result.map((category) =>
        `<option value="${category.id}">${escapeHtml(category.name)}</option>`
      ).join('');
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
  return () => { active = false; };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}
