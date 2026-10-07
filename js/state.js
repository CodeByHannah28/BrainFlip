const listeners = new Set();

function createInitialState() {
  return {
    topic: null,
    status: 'idle',
    message: '',
    source: null,
    questions: [],
    currentIndex: 0,
    answers: [],
    cards: [],
    knownCards: [],
    timeLimit: 0,
    secondsLeft: 0,
    score: 0,
    finished: false,
    timeUsedSeconds: 0,
    autoStartTopic: null,
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