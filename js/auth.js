import { SETTINGS } from './config.js';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from './firebase.js';

let currentUser = null;
let ready = false;
let listeners = [];

function isTooOld(user) {
  const lastSignIn = new Date(user.metadata.lastSignInTime).getTime();
  const maxAge = SETTINGS.signInDays * 24 * 60 * 60 * 1000;
  return Date.now() - lastSignIn > maxAge;
}

onAuthStateChanged(auth, function (user) {
  if (user && isTooOld(user)) {
    signOut(auth);
    return;
  }

  currentUser = user;
  ready = true;

  const copy = listeners.slice();
  for (let i = 0; i < copy.length; i++) {
    copy[i](currentUser);
  }
});

export function getUser() {
  return currentUser;
}

export function isAuthReady() {
  return ready;
}

export function onUserChange(listener) {
  listeners.push(listener);

  return function () {
    listeners = listeners.filter(function (item) {
      return item !== listener;
    });
  };
}

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signOutUser() {
  return signOut(auth);
}
