import { SETTINGS } from './config.js';

const LOCAL_KEY = 'brainflip.scores';

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) ?? [];
  } catch {
    return [];
  }
}

function writeLocal(list) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    // storage full or blocked: ignore
  }
}

// The agreed score shape
export function buildScore({ topic, correct, wrong, timeUsedSeconds }) {
  return { topic, correct, wrong, timeUsedSeconds, date: new Date().toISOString() };
}

// Tries the backend first. If it fails, keeps the score on this device.
// Returns { saved: 'backend' } or { saved: 'local' }.
export async function saveScore(score) {
  try {
    const response = await fetch(`${SETTINGS.backendBase}/api/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(score),
    });
    if (!response.ok) throw new Error(`Backend error ${response.status}`);
    return { saved: 'backend' };
  } catch (error) {
    console.warn('Could not save score online:', error.message);
    writeLocal([...readLocal(), score]);
    return { saved: 'local' };
  }
}

// Returns a list of scores in the same shape
export async function loadScores() {
  try {
    const response = await fetch(`${SETTINGS.backendBase}/api/scores`);
    if (!response.ok) throw new Error(`Backend error ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Could not load scores online:', error.message);
    return readLocal();
  }
}