# BrainFlip

Timed multiple-choice quizzes and 3D flip flashcards. Questions and topics come from Open Trivia DB. Google sign-in and saved progress use Firebase.

Plain HTML, CSS and JavaScript. No framework, no build step.

## Run it

ES modules do not work from `file://`. Serve the folder:

- VS Code Live Server, or
- `python3 -m http.server 5500` then open `http://localhost:5500`

## Firebase setup

1. Create a project in the Firebase console.
2. Add a Web app and copy its config into `js/firebase-config.js`.
3. Authentication > Sign-in method: enable Google.
4. Authentication > Settings > Authorized domains: add `localhost`, `127.0.0.1` and your live domain.
5. Create a Firestore database.
6. Firestore > Rules: paste `firestore.rules` and publish.

The web config values are public. Security comes from Authentication and the Firestore rules.

## Folder guide

```
index.html           page shell: sidebar, top bar, sign-in area
css/                 tokens.css, base.css, shell.css
css/screens/         one file per screen
js/app.js            router and menu
js/api.js            all Open Trivia DB requests
js/state.js          shared in-memory session data
js/auth.js           Firebase sign-in state and 30-day limit
js/auth-ui.js        sign-in button, avatar, sign-out, tooltip
js/database.js       Firestore reads and writes
js/screens/          one file per screen
firestore.rules      Firestore security rules
```

## Rules

- Questions and topics only come from `js/api.js`.
- No hardcoded questions or topics.
- Guest progress lives in memory and disappears on refresh.
- Signed-in progress is saved in Firestore under `users/{uid}`.
- No localStorage for progress.
- Colors, spacing and sizes come from `css/tokens.css`.
- One CSS declaration per line. No comments.
