import { SETTINGS, MESSAGES } from './config.js';

function shuffle(list) {
  const copy = [...list];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));

    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}
function decodeHtml(value) {
  if (typeof value !== 'string') return '';
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;

  return textarea.value;
}

export async function fetchCategories() {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, SETTINGS.requestTimeoutMs);

  try {
    const response = await fetch(
      `${SETTINGS.triviaApiBase}/api_category.php`,
      {
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`Category request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.trivia_categories)) {
      throw new Error('Invalid category response');
    }

    const categories = data.trivia_categories
      .filter((category) =>
        category &&
        Number.isInteger(category.id) &&
        category.id > 0 &&
        typeof category.name === 'string' &&
        decodeHtml(category.name).trim()
      )
      .map((category) => ({ id: category.id, name: decodeHtml(category.name) }));

    if (categories.length === 0) throw new Error('Empty category response');
    return categories;
  } catch (error) {
    console.warn('Could not load Open Trivia DB categories:', error);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeQuestion(item, categoryId) {
  if (
    !item ||
    typeof item.question !== 'string' || !item.question.trim() ||
    typeof item.correct_answer !== 'string' ||
    !Array.isArray(item.incorrect_answers) ||
    item.incorrect_answers.length !== 3 ||
    item.incorrect_answers.some((answer) => typeof answer !== 'string')
  ) return null;

  const options = [
    ...item.incorrect_answers,
    item.correct_answer,
  ].map(decodeHtml);

  const question = decodeHtml(item.question);
  const correctAnswer = decodeHtml(item.correct_answer);

  if (
    !question.trim() ||
    options.some((option) => !option.trim()) ||
    new Set(options).size !== 4
  ) return null;

  const shuffledOptions = shuffle(options);
  const correctIndex = shuffledOptions.indexOf(correctAnswer);

  if (correctIndex === -1) return null;

  return {
    id: `${categoryId}-${crypto.randomUUID()}`,
    topic: String(categoryId),
    question,
    code: null,
    options: shuffledOptions,
    correctIndex,
    explanation: '',
  };
}

export async function loadQuestions(
  categoryId,
  limit = SETTINGS.questionsPerQuiz
) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, SETTINGS.requestTimeoutMs);

  try {
    const params = new URLSearchParams({
      amount: String(limit),
      category: String(categoryId),
      type: 'multiple',
    });

    const response = await fetch(
      `${SETTINGS.triviaApiBase}/api.php?${params}`,
      {
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`Question request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !Number.isInteger(data.response_code)) {
      throw new Error('Invalid question response');
    }

    if (data.response_code !== 0) {
      throw new Error(
        `Open Trivia DB response code: ${data.response_code}`
      );
    }

    if (!Array.isArray(data.results)) {
      throw new Error('Invalid question response');
    }

    if (data.results.length === 0) {
      throw new Error(MESSAGES.noQuestions);
    }

    const questions = data.results
      .map((item) => normalizeQuestion(item, categoryId))
      .filter(Boolean);

    if (questions.length === 0) {
      throw new Error(MESSAGES.noQuestions);
    }

    return questions;
  } catch (error) {
    console.warn('Could not load Open Trivia DB questions:', error);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
