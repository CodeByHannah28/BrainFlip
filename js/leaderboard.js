import {
  db,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from './firebase.js';
import { getUser } from './auth.js';
import { getDisplayName } from './daily.js';

const BOARD_SIZE = 20;

function toRow(data) {
  return {
    uid: data.uid,
    name: data.displayName,
    correct: data.correct,
    total: data.total,
    time: data.timeUsedSeconds,
  };
}

export async function submitScore(entry) {
  const user = getUser();
  if (!user) {
    throw new Error('Not signed in');
  }
  await addDoc(collection(db, 'scores'), {
    uid: user.uid,
    displayName: getDisplayName(user),
    topic: String(entry.topic).slice(0, 60),
    difficulty: entry.difficulty,
    correct: entry.correct,
    total: entry.total,
    timeUsedSeconds: entry.timeUsedSeconds,
    createdAt: serverTimestamp(),
  });
}

export async function loadTopScores(total) {
  const scoresQuery = query(
    collection(db, 'scores'),
    where('total', '==', total),
    orderBy('correct', 'desc'),
    orderBy('timeUsedSeconds', 'asc'),
    limit(60),
  );
  const snapshot = await getDocs(scoresQuery);

  const rows = [];
  const seen = {};
  snapshot.forEach(function (item) {
    const row = toRow(item.data());
    if (!seen[row.uid] && rows.length < BOARD_SIZE) {
      seen[row.uid] = true;
      rows.push(row);
    }
  });
  return rows;
}

export async function loadDailyBoard(dateId) {
  const entriesQuery = query(
    collection(db, 'dailyChallenges', dateId, 'entries'),
    orderBy('correct', 'desc'),
    orderBy('timeUsedSeconds', 'asc'),
    limit(BOARD_SIZE),
  );
  const snapshot = await getDocs(entriesQuery);

  const rows = [];
  snapshot.forEach(function (item) {
    rows.push(toRow(item.data()));
  });
  return rows;
}