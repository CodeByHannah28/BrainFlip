export const SETTINGS = {
  breakpoint: 900, // keep in sync with css/shell.css
  questionsPerQuiz: 10,
  secondsPerQuestion: 30,
  requestTimeoutMs: 8000,
  quizApiBase: 'https://quizapi.io/api/v1',
  backendBase: 'http://localhost:3000', // change when the backend is hosted
};

// Topics shown on Flashcards, Quiz and Decks.
// "tag" is the word QuizAPI uses. Check each one in Step 8.
export const TOPICS = [
  { id: 'javascript', label: 'JavaScript', tag: 'JavaScript' },
  { id: 'html-css', label: 'HTML & CSS', tag: 'HTML' },
  { id: 'databases', label: 'Databases', tag: 'MySQL' },
  { id: 'react', label: 'React', tag: 'React' },
  { id: 'python', label: 'Python', tag: 'Python' },
];

// One place for every message the user can see while questions load
export const MESSAGES = {
  loading: 'Getting your questions...',
  slow: 'This is taking a little longer than usual...',
  fallback: "We couldn't reach the question service, so here are practice questions instead.",
  error: 'Something went wrong while loading questions. Please try again.',
  scoreNotSaved: "We couldn't save your score online, so it was saved on this device.",
};

// The API key lives in js/config.local.js, which is NOT committed to GitHub.
// A 404 for config.local.js in the console is normal if you have no key yet.
let apiKey = '';
try {
  const local = await import('./config.local.js');
  apiKey = local.QUIZ_API_KEY ?? '';
} catch {
  apiKey = '';
}
export const QUIZ_API_KEY = apiKey;