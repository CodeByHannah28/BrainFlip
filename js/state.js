import { SETTINGS } from './config.js';

function createState() {
  return {
    selectedCategory: null,
    difficulty: '',
    amount: SETTINGS.questionsPerQuiz,
    questions: [],
    answers: [],
    currentIndex: 0,
    timeUsedSeconds: 0,
    finished: false,
    resultSaved: false,
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
    questions: [],
    answers: [],
    currentIndex: 0,
    timeUsedSeconds: 0,
    finished: false,
    resultSaved: false,
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
