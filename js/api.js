import { SETTINGS, MESSAGES } from './config.js';

let categoriesCache = null;
let countsCache = null;
let lastRequestTime = 0;

function wait(milliseconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds);
  });
}

async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(function () {
    controller.abort();
  }, SETTINGS.requestTimeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok && response.status !== 429) {
      throw new Error('Request failed');
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function waitForGap() {
  const passed = Date.now() - lastRequestTime;
  if (passed < SETTINGS.requestGapMs) {
    await wait(SETTINGS.requestGapMs - passed);
  }
  lastRequestTime = Date.now();
}

async function requestQuestions(url) {
  let data = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    await waitForGap();
    data = await getJson(url);
    if (data.response_code !== 5) {
      return data;
    }
  }
  return data;
}

function decode(text) {
  return decodeURIComponent(text);
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = list[i];
    list[i] = list[j];
    list[j] = temp;
  }
}

function makeQuestion(item, index) {
  const options = [];
  for (let i = 0; i < item.incorrect_answers.length; i++) {
    options.push(decode(item.incorrect_answers[i]));
  }
  const correctAnswer = decode(item.correct_answer);
  options.push(correctAnswer);
  shuffle(options);

  return {
    id: 'q' + index,
    question: decode(item.question),
    options: options,
    correctIndex: options.indexOf(correctAnswer),
  };
}

export async function getCategories() {
  if (categoriesCache) {
    return categoriesCache;
  }
  const data = await getJson(SETTINGS.triviaApiBase + '/api_category.php');
  categoriesCache = data.trivia_categories;
  return categoriesCache;
}

export async function getCategoryCounts() {
  if (countsCache) {
    return countsCache;
  }
  const counts = {};
  try {
    const data = await getJson(SETTINGS.triviaApiBase + '/api_count_global.php');
    for (const id in data.categories) {
      counts[id] = data.categories[id].total_num_of_verified_questions;
    }
    countsCache = counts;
  } catch (error) {
    return {};
  }
  return countsCache;
}

export async function loadQuestions(categoryId, amount, difficulty) {
  let url =
    SETTINGS.triviaApiBase +
    '/api.php?amount=' +
    amount +
    '&category=' +
    categoryId +
    '&type=multiple&encode=url3986';
  if (difficulty) {
    url = url + '&difficulty=' + difficulty;
  }

  let data = null;
  try {
    data = await requestQuestions(url);
  } catch (error) {
    throw new Error(MESSAGES.error);
  }

  if (data.response_code === 1) {
    throw new Error(MESSAGES.noQuestions);
  }
  if (data.response_code !== 0) {
    throw new Error(MESSAGES.error);
  }

  const questions = [];
  try {
    for (let i = 0; i < data.results.length; i++) {
      questions.push(makeQuestion(data.results[i], i));
    }
  } catch (error) {
    throw new Error(MESSAGES.error);
  }
  return questions;
}

export async function loadCards(categoryId, amount, difficulty) {
  const questions = await loadQuestions(categoryId, amount, difficulty);
  const cards = [];
  for (let i = 0; i < questions.length; i++) {
    cards.push({
      id: questions[i].id,
      term: questions[i].question,
      definition: questions[i].options[questions[i].correctIndex],
    });
  }
  return cards;
}
