import { SETTINGS } from './config.js';

function createState() {
  return {
    selectedCategory: null,
    difficulty: '',
    amount: SETTINGS.questionsPerQuiz,
    mode: 'quiz',
    dailyId: '',
    dailyName: '',
    questions: [],
    answers: [],
    currentIndex: 0,
    timeUsedSeconds: 0,
    quizLimit: 0,
    quizStartedAt: 0,
    quizEndsAt: 0,
    endReason: '',
    warnings: 0,
    warningSeen: false,
    finished: false,
    resultSaved: false,
    boardSubmitted: false,
    flashCategoryId: null,
    flashQueue: [],
    flashKnown: [],
    flashTotal: 0,
    flashAgain: 0,
  };
}

let state = createState();

export function getState() {
  return state;
}

export function setState(changes) {
  state = Object.assign({}, state, changes);
}

export function resetQuiz() {
  setState({
    mode: 'quiz',
    dailyId: '',
    dailyName: '',
    questions: [],
    answers: [],
    currentIndex: 0,
    timeUsedSeconds: 0,
    quizLimit: 0,
    quizStartedAt: 0,
    quizEndsAt: 0,
    endReason: '',
    warnings: 0,
    warningSeen: false,
    finished: false,
    resultSaved: false,
    boardSubmitted: false,
  });
}

export function resetFlashcards() {
  setState({
    flashCategoryId: null,
    flashQueue: [],
    flashKnown: [],
    flashTotal: 0,
    flashAgain: 0,
  });
}