export const SETTINGS = {
  breakpoint: 900,
  questionsPerQuiz: 10,
  secondsPerQuestion: 30,
  requestTimeoutMs: 8000,

  // Open Trivia DB
  triviaApiBase: 'https://opentdb.com',

  backendBase: 'http://localhost:3000',
};

// User-facing messages used throughout the question-loading flow.
export const MESSAGES = {
  loading: 'Getting your questions...',
  slow: 'This is taking a little longer than usual...',
  error:
    'Could not load questions. Please check your internet connection and try again.',
  noQuestions:
    'No questions were available for this topic. Please choose another topic and try again.',
  scoreNotSaved:
    "We couldn't save your score online, so it was saved on this device.",
};