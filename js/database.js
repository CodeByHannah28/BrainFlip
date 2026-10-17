import {
  db,
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
  increment,
  serverTimestamp,
  Timestamp,
} from './firebase.js';
import { getUser, onUserChange } from './auth.js';

const LOCAL_KEY = 'brainflip.guest.progress';
const MAX_QUIZZES = 50;

let syncing = null;

function emptyLocal() {
  return { quizzes: [], flashcards: {} };
}

function readLocal() {
  try {
    const data = JSON.parse(localStorage.getItem(LOCAL_KEY));
    if (data && Array.isArray(data.quizzes) && data.flashcards) {
      return data;
    }
  } catch (error) {
    return emptyLocal();
  }
  return emptyLocal();
}

function writeLocal(data) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch (error) {
    return;
  }
}

function saveQuizLocal(result) {
  const data = readLocal();
  data.quizzes.unshift(Object.assign({}, result, { createdAt: Date.now() }));
  data.quizzes = data.quizzes.slice(0, MAX_QUIZZES);
  writeLocal(data);
}

function saveFlashcardLocal(category, kind) {
  const data = readLocal();
  const key = String(category.id);
  const deck = data.flashcards[key] || { category: category.name, gotIt: 0, reviewAgain: 0 };

  deck.category = category.name;
  deck.updatedAt = Date.now();
  if (kind === 'gotIt') {
    deck.gotIt = (deck.gotIt || 0) + 1;
  } else {
    deck.reviewAgain = (deck.reviewAgain || 0) + 1;
  }

  data.flashcards[key] = deck;
  writeLocal(data);
}

function loadLocalProgress() {
  const data = readLocal();
  const flashcards = [];
  const keys = Object.keys(data.flashcards);
  for (let i = 0; i < keys.length; i++) {
    flashcards.push(Object.assign({ id: keys[i] }, data.flashcards[keys[i]]));
  }
  flashcards.sort(function (a, b) {
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
  return { quizzes: data.quizzes, flashcards: flashcards };
}

async function moveLocalToAccount(user) {
  let data = readLocal();
  if (data.quizzes.length === 0 && Object.keys(data.flashcards).length === 0) {
    return;
  }

  await setDoc(doc(db, 'users', user.uid), { email: user.email }, { merge: true });

  const oldestFirst = data.quizzes.slice().reverse();
  for (let i = 0; i < oldestFirst.length; i++) {
    const item = oldestFirst[i];
    const copy = Object.assign({}, item, { createdAt: Timestamp.fromMillis(item.createdAt) });
    await addDoc(collection(db, 'users', user.uid, 'quizzes'), copy);

    data = readLocal();
    data.quizzes.pop();
    writeLocal(data);
  }

  const keys = Object.keys(readLocal().flashcards);
  for (let i = 0; i < keys.length; i++) {
    data = readLocal();
    const deck = data.flashcards[keys[i]];
    await setDoc(
      doc(db, 'users', user.uid, 'flashcards', keys[i]),
      {
        category: deck.category,
        gotIt: increment(deck.gotIt || 0),
        reviewAgain: increment(deck.reviewAgain || 0),
        updatedAt: Timestamp.fromMillis(deck.updatedAt || Date.now()),
      },
      { merge: true },
    );

    data = readLocal();
    delete data.flashcards[keys[i]];
    writeLocal(data);
  }
}

function syncLocalProgress() {
  const user = getUser();
  if (!user) {
    return Promise.resolve();
  }
  if (syncing) {
    return syncing;
  }
  syncing = moveLocalToAccount(user).finally(function () {
    syncing = null;
  });
  return syncing;
}

onUserChange(function (user) {
  if (user) {
    syncLocalProgress().catch(function () {});
  }
});

export async function saveQuizResult(result) {
  const user = getUser();
  if (!user) {
    saveQuizLocal(result);
    return;
  }

  await setDoc(doc(db, 'users', user.uid), { email: user.email }, { merge: true });

  const data = Object.assign({}, result, { createdAt: serverTimestamp() });
  await addDoc(collection(db, 'users', user.uid, 'quizzes'), data);
}

export async function saveFlashcardResult(category, kind) {
  const user = getUser();
  if (!user) {
    saveFlashcardLocal(category, kind);
    return;
  }

  const data = {
    category: category.name,
    updatedAt: serverTimestamp(),
  };
  if (kind === 'gotIt') {
    data.gotIt = increment(1);
  } else {
    data.reviewAgain = increment(1);
  }

  await setDoc(doc(db, 'users', user.uid, 'flashcards', String(category.id)), data, {
    merge: true,
  });
}

export async function loadProgress() {
  const user = getUser();
  if (!user) {
    return loadLocalProgress();
  }

  try {
    await syncLocalProgress();
  } catch (error) {
    console.warn('Could not move device progress to your account:', error.message);
  }

  const quizzes = [];
  const flashcards = [];

  const quizQuery = query(
    collection(db, 'users', user.uid, 'quizzes'),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  const quizSnapshot = await getDocs(quizQuery);
  quizSnapshot.forEach(function (item) {
    quizzes.push(item.data());
  });

  const cardSnapshot = await getDocs(collection(db, 'users', user.uid, 'flashcards'));
  cardSnapshot.forEach(function (item) {
    flashcards.push(Object.assign({ id: item.id }, item.data()));
  });

  return { quizzes: quizzes, flashcards: flashcards };
}