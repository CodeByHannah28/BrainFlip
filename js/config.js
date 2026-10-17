export const SETTINGS = {
  questionsPerQuiz: 10,
  amountOptions: [5, 10, 15, 20],
  secondsPerQuestion: 30,
  requestTimeoutMs: 10000,
  requestGapMs: 5200,
  signInDays: 30,
  triviaApiBase: 'https://opentdb.com',
};

export const MESSAGES = {
  loading: 'Getting your questions...',
  loadingTopics: 'Getting topics...',
  error: 'Could not load questions. Please check your internet connection and try again.',
  topicsError: 'Could not load topics. Please check your internet connection and try again.',
  noQuestions:
    'There are not enough questions for this topic and difficulty. Try fewer questions, another difficulty or another topic.',
  guest: 'Your progress is saved on this device. Sign in with Google to keep it on any device.',
  guestSaved:
    'This result is saved on this device. Sign in with Google to keep it on any device.',
  signInTip: 'Sign in with Google to keep your progress on any device',
};