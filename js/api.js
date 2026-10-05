import { SETTINGS, MESSAGES, QUIZ_API_KEY } from './config.js';
import { fallbackQuestions } from '../data/fallback-questions.js';

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Turns one QuizAPI question into OUR question format.
// If the real response looks different, this is the only function to change.
function normalizeQuizApiQuestion(item, topic) {
  const options = [];
  let correctIndex = -1;
  let correctCount = 0;

  for (const letter of ['a', 'b', 'c', 'd', 'e', 'f']) {
    const text = item.answers?.[`answer_${letter}`];
    if (!text) continue;
    if (item.correct_answers?.[`answer_${letter}_correct`] === 'true') {
      correctIndex = options.length;
      correctCount += 1;
    }
    options.push(text);
  }

  // We only accept questions with exactly 4 options and 1 correct answer
  if (options.length !== 4 || correctCount !== 1) return null;

  return {
    id: `${topic.id}-${item.id}`,
    topic: topic.id,
    question: item.question,
    code: null,
    options,
    correctIndex,
    explanation: item.explanation || '',
  };
}

async function fetchFromQuizApi(topic, limit) {
  if (!QUIZ_API_KEY) throw new Error('No QuizAPI key set');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SETTINGS.requestTimeoutMs);

  try {
    const url = new URL(`${SETTINGS.quizApiBase}/questions`);
    url.search = new URLSearchParams({
      apiKey: QUIZ_API_KEY,
      limit: String(Math.min(limit * 2, 20)), // ask for extra: some get filtered out
      tags: topic.tag,
    }).toString();

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`QuizAPI error ${response.status}`);

    const data = await response.json();
    const questions = data
      .map((item) => normalizeQuizApiQuestion(item, topic))
      .filter(Boolean)
      .slice(0, limit);

    if (questions.length === 0) throw new Error('No usable questions came back');
    return questions;
  } finally {
    clearTimeout(timer);
  }
}

// The Quiz screen calls this. It never throws for API problems:
// if the API fails, it returns local practice questions and a friendly message.
export async function loadQuestions(topic, limit = SETTINGS.questionsPerQuiz) {
  try {
    const questions = await fetchFromQuizApi(topic, limit);
    return { questions, source: 'api', message: '' };
  } catch (error) {
    console.warn('Questions API failed:', error.message);
    const local = fallbackQuestions.filter((q) => q.topic === topic.id);
    const pool = local.length > 0 ? local : fallbackQuestions;
    return {
      questions: shuffle(pool).slice(0, limit),
      source: 'fallback',
      message: MESSAGES.fallback,
    };
  }
}