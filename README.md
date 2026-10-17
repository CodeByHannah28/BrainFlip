# BrainFlip

## About

BrainFlip is a study app for exam prep. Pick a topic, then take a timed multiple-choice quiz or practise with 3D flip flashcards. Questions and topics come from Open Trivia DB. Google sign-in and saved progress use Firebase.

Plain HTML, CSS and JavaScript. No framework, no build step.

**Live site:** https://brainflip-omega.vercel.app/

## Features

- Timed quizzes with your choice of topic, difficulty and number of questions.
- Change your answer: click another option to switch it. Your latest choice counts, and the timer does not restart.
- If time runs out on a question, it is locked and no answer is recorded.
- Move between questions with the Previous and Next buttons, the numbered dots, or the arrow keys. Press A to D to answer.
- 3D flip flashcards with "Got it" and "Review again".
- Results page and Review Answers page.
- Progress page with quiz history, average score, best score and flashcard stats.
- Progress is saved even when you are not signed in.
- Click the BrainFlip logo or name on any page to go back to Home.

## Run it

ES modules do not work from `file://`, so you need to serve the folder with VS Code Live Server:

1. Install the Live Server extension in VS Code.
2. Right-click `index.html` and choose "Open with Live Server".
3. The app opens at `http://127.0.0.1:5501/index.html` (the port number can be different on your computer).

## Firebase setup

1. Create a project in the Firebase console.
2. Add a Web app and copy its config into `js/firebase-config.js`.
3. Authentication > Sign-in method: enable Google.
4. Authentication > Settings > Authorized domains: add `localhost`, `127.0.0.1` and your live domain (`brainflip-omega.vercel.app`).
5. Create a Firestore database.
6. Firestore > Rules: paste `firestore.rules` and publish.

The web config values are public. Security comes from Authentication and the Firestore rules.

## How progress is saved

- Not signed in: progress is saved in the browser (localStorage) on that device.
- Signed in: progress is saved in Firestore under `users/{uid}`.
- When a guest signs in, their saved progress moves to their account and is cleared from the device.
- Guest progress only lives in one browser. Clearing site data or switching devices before signing in loses it.

## Folder guide

```
index.html           page shell: sidebar, top bar, sign-in area
css/                 tokens.css, base.css, shell.css
css/screens/         one file per screen
data/topics.js       topic names, descriptions, colors and icons
js/app.js            router and menu
js/nav.js            goTo() helper for changing screens
js/api.js            all Open Trivia DB requests
js/config.js         settings and messages
js/helpers.js        small shared functions
js/state.js          shared in-memory session data
js/auth.js           Firebase sign-in state and 30-day limit
js/auth-ui.js        sign-in button, avatar, sign-out, tooltip
js/firebase.js       Firebase setup and exports
js/database.js       saving and loading progress (localStorage and Firestore)
js/screens/          one file per screen
firestore.rules      Firestore security rules
```

## Rules

- Questions and topics only come from `js/api.js`.
- No hardcoded questions or topics.
- Guest progress is saved in localStorage under `brainflip.guest.progress`.
- Signed-in progress is saved in Firestore under `users/{uid}`.
- When a guest signs in, their saved progress moves to their account.
- Colors, spacing and sizes come from `css/tokens.css`.
- One CSS declaration per line. No comments.