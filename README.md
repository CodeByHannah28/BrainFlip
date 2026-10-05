# BrainFlip
A timed quiz and 3D flip flashcard app for exam prep. Pick a topic, answer multiple-choice questions against the clock, flip cards to learn definitions, and review every answer at the end. Built with HTML, CSS and vanilla JavaScript.


Flip it till you know it. Timed quizzes and 3D flip flashcards for exam prep.

## Run it
1. Install VS Code and the Live Server and Prettier extensions.
2. Clone the repo and open the folder in VS Code.
3. Right-click `index.html` > Open with Live Server.

## Where things go
- `css/tokens.css`: colours, fonts, spacing. Use these names, never raw values.
- `css/screens/`: one CSS file per screen (create yours, link it from your screen's JS if needed).
- `js/screens/`: one file per screen. Each exports `render(root)` and may return a cleanup function.
- `js/state.js`: shared app memory. Quiz, Results and Review Answers all read it.
- `js/api.js`: loads questions. `js/scores-api.js`: saves and loads scores.
- `js/nav.js`: `goTo('results')` moves to another screen.
- `data/`: local flashcards and practice questions.
- `backend/`: the scores backend (Task 11).

## Rules
- Nobody works on `main`. One branch per task: `feature/quiz-timer`.
- Open a pull request when finished. The lead reviews and merges.
- Use design tokens. Do not type colour codes.
- Mobile-first: design for phones, then add `@media (min-width: 900px)`.
- No frameworks. HTML, CSS and vanilla JS only.

## Responsive breakpoint
900px. Below: hamburger and slide-in drawer. 900px and up: sidebar.

## Moving between screens
One screen at a time on a single page, using the URL hash (`#/quiz`).
Routes: home, flashcards, quiz, results, decks, review.

## Question format
{
  id: 'javascript-123',
  topic: 'javascript',
  question: 'Which keyword declares a block-scoped variable?',
  code: null,                 // optional code snippet shown under the question
  options: ['var', 'let', 'define', 'static'],   // always 4
  correctIndex: 1,            // position in options, starting from 0
  explanation: 'let is limited to the block where it is declared.'
}

## Flashcard format
{ id: 'card-js-1', topic: 'javascript', term: 'function', definition: '...' }

## Loading and error messages (all in js/config.js)
- Loading: "Getting your questions..."
- Slow (after about 4 seconds): "This is taking a little longer than usual..."
- API failed: practice questions are used and the user sees the fallback message.

## App memory (js/state.js)
topic, status, message, source, questions, currentIndex, answers,
cards, knownCards, timeLimit, secondsLeft, score, finished.

## Score shape
{ topic, correct, wrong, timeUsedSeconds, date }   // date is an ISO string

## Backend contract (Tasks 11 and 12)
- POST /api/scores: saves one score (body = score shape)
- GET /api/scores: returns a list of scores
