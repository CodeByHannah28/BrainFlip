const listeners = new Set();

function createInitialState() {
  return {
    topic: null, // { id, label, tag }
    status: 'idle', // 'idle' | 'loading' | 'ready' | 'error'
    message: '', // friendly loading, fallback or error text
    source: null, // 'api' | 'fallback'
    questions: [], // see "Question format" in the README
    currentIndex: 0,
    answers: [], // { questionId, pickedIndex, correctIndex, isCorrect }
    cards: [], // see "Flashcard format" in the README
    knownCards: [], // ids of cards marked "Got it"
    timeLimit: 0, // total seconds for the quiz
    secondsLeft: 0,
    score: 0, // number of correct answers
    finished: false,
  };
}

let state = createInitialState();

export function getState() {
  return state;
}

export function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener(state));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetState() {
  setState(createInitialState());
}

// Use pickedIndex = null when time runs out with no answer
export function recordAnswer({ questionId, pickedIndex, correctIndex }) {
  const isCorrect = pickedIndex === correctIndex;
  setState({
    answers: [...state.answers, { questionId, pickedIndex, correctIndex, isCorrect }],
    score: state.score + (isCorrect ? 1 : 0),
  });
}

export function markCardKnown(cardId) {
  if (state.knownCards.includes(cardId)) return;
  setState({ knownCards: [...state.knownCards, cardId] });
}