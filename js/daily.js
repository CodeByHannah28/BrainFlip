import { db, doc, getDoc, setDoc, serverTimestamp } from './firebase.js';
import { getUser } from './auth.js';
import { loadQuestions } from './api.js';
import { SETTINGS } from './config.js';
import { TOPICS } from '../data/topics.js';

export const DAILY_QUESTIONS = 10;

const DAY_NAMES = [
  'Sunday Brain Spark',
  'Monday Mind Bender',
  'Tuesday Brain Teaser',
  'Wisdom Wednesday',
  'Thursday Think Tank',
  'Fast Flip Friday',
  'Saturday Showdown',
];

const STARTED_KEY = 'brainflip.daily.started';
const DAY_MS = 24 * 60 * 60 * 1000;

export function getDisplayName(user) {
  const name = String(user.displayName || '').trim().slice(0, 30);
  if (name) {
    return name;
  }
  return 'Player';
}

export function getTodayId() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayId() {
  return new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);
}

export function getTodayInfo() {
  const now = new Date();
  const topic = TOPICS[Math.floor(now.getTime() / DAY_MS) % TOPICS.length];
  return {
    id: getTodayId(),
    name: DAY_NAMES[now.getUTCDay()],
    category: { id: topic.id, name: topic.label },
    total: DAILY_QUESTIONS,
  };
}

export function getHoursUntilNext() {
  const now = Date.now();
  const next = (Math.floor(now / DAY_MS) + 1) * DAY_MS;
  return Math.max(1, Math.ceil((next - now) / (60 * 60 * 1000)));
}

function startedKey(uid, dateId) {
  return STARTED_KEY + '.' + uid + '.' + dateId;
}

export function markDailyStarted(dateId) {
  const user = getUser();
  if (!user) {
    return;
  }
  try {
    localStorage.setItem(startedKey(user.uid, dateId), '1');
  } catch (error) {
    return;
  }
}

export function wasDailyStarted(dateId) {
  const user = getUser();
  if (!user) {
    return false;
  }
  try {
    return localStorage.getItem(startedKey(user.uid, dateId)) === '1';
  } catch (error) {
    return false;
  }
}

function toChallenge(info, data) {
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error('Challenge is not ready');
  }
  return {
    id: info.id,
    name: data.name || info.name,
    category: info.category,
    questions: data.questions,
  };
}

export async function fetchChallenge() {
  const user = getUser();
  if (!user) {
    throw new Error('Not signed in');
  }

  const info = getTodayInfo();
  const ref = doc(db, 'dailyChallenges', info.id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    return toChallenge(info, existing.data());
  }

  const questions = await loadQuestions(info.category.id, DAILY_QUESTIONS, '');
  try {
    await setDoc(ref, {
      name: info.name,
      date: info.id,
      questions: questions,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    const again = await getDoc(ref);
    if (again.exists()) {
      return toChallenge(info, again.data());
    }
    throw error;
  }

  return { id: info.id, name: info.name, category: info.category, questions: questions };
}

export async function getEntry(dateId) {
  const user = getUser();
  if (!user) {
    return null;
  }
  const snapshot = await getDoc(doc(db, 'dailyChallenges', dateId, 'entries', user.uid));
  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.data();
}

export async function submitDailyEntry(dateId, entry) {
  const user = getUser();
  if (!user) {
    throw new Error('Not signed in');
  }
  await setDoc(doc(db, 'dailyChallenges', dateId, 'entries', user.uid), {
    uid: user.uid,
    displayName: getDisplayName(user),
    correct: entry.correct,
    total: entry.total,
    timeUsedSeconds: entry.timeUsedSeconds,
    createdAt: serverTimestamp(),
  });
}

export async function forfeitDaily(info) {
  await submitDailyEntry(info.id, {
    correct: 0,
    total: info.total,
    timeUsedSeconds: info.total * SETTINGS.secondsPerQuestion,
  });
}

export async function getStreak() {
  const user = getUser();
  if (!user) {
    return { current: 0, longest: 0, lastPlayedDate: '' };
  }
  const snapshot = await getDoc(doc(db, 'users', user.uid));
  let data = {};
  if (snapshot.exists()) {
    data = snapshot.data();
  }
  const last = data.lastPlayedDate || '';
  let current = 0;
  if (last === getTodayId() || last === getYesterdayId()) {
    current = data.currentStreak || 0;
  }
  return { current: current, longest: data.longestStreak || 0, lastPlayedDate: last };
}

export async function recordDailyStreak() {
  const user = getUser();
  if (!user) {
    return;
  }
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);
  let data = {};
  if (snapshot.exists()) {
    data = snapshot.data();
  }

  const today = getTodayId();
  if (data.lastPlayedDate === today) {
    return;
  }

  let current = 1;
  if (data.lastPlayedDate === getYesterdayId()) {
    current = (data.currentStreak || 0) + 1;
  }
  const longest = Math.max(data.longestStreak || 0, current);

  await setDoc(
    ref,
    {
      email: user.email,
      currentStreak: current,
      longestStreak: longest,
      lastPlayedDate: today,
    },
    { merge: true },
  );
}