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
} from './firebase.js';
import { getUser } from './auth.js';

export async function saveQuizResult(result) {
  const user = getUser();
  if (!user) {
    return;
  }

  await setDoc(doc(db, 'users', user.uid), { email: user.email }, { merge: true });

  const data = Object.assign({}, result, { createdAt: serverTimestamp() });
  await addDoc(collection(db, 'users', user.uid, 'quizzes'), data);
}

export async function saveFlashcardResult(category, kind) {
  const user = getUser();
  if (!user) {
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
    flashcards.push(item.data());
  });

  return { quizzes: quizzes, flashcards: flashcards };
}
