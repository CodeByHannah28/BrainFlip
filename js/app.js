import { setupAuthUi } from './auth-ui.js';
import { goTo } from './nav.js';
import { getState, resetQuiz } from './state.js';
import { askToLeaveQuiz } from './confirm.js';
import * as home from './screens/home.js';
import * as flashcards from './screens/flashcards.js';
import * as quiz from './screens/quiz.js';
import * as results from './screens/results.js';
import * as decks from './screens/decks.js';
import * as review from './screens/review.js';
import * as progress from './screens/progress.js';

const routes = {
  home: { title: 'Home', screen: home },
  flashcards: { title: 'Flashcards', screen: flashcards },
  quiz: { title: 'Quiz', screen: quiz },
  results: { title: 'Results', screen: results },
  decks: { title: 'Decks', screen: decks },
  review: { title: 'Review Answers', screen: review },
  progress: { title: 'Progress', screen: progress },
};

const screenMain = document.getElementById('screen');
const screenRoot = document.getElementById('screen-body');
const pageBack = document.getElementById('page-back');
const menuBtn = document.getElementById('menu-btn');
const closeBtn = document.getElementById('close-btn');
const scrim = document.getElementById('scrim');
const navList = document.querySelector('.nav-list');
const brandLinks = document.querySelectorAll('.brand-link');

let cleanup = null;
let firstRender = true;
let currentRoute = null;
let asking = false;

function openMenu() {
  document.body.classList.add('nav-open');
  scrim.hidden = false;
  menuBtn.setAttribute('aria-expanded', 'true');
  document.querySelector('.nav-link').focus();
}

function closeMenu() {
  document.body.classList.remove('nav-open');
  scrim.hidden = true;
  menuBtn.setAttribute('aria-expanded', 'false');
}

function getRouteName() {
  const name = location.hash.replace('#/', '');
  if (Object.keys(routes).includes(name)) {
    return name;
  }
  return 'home';
}

function isQuizRunning() {
  const state = getState();
  return currentRoute === 'quiz' && state.questions.length > 0 && !state.finished;
}

function renderRoute() {
  const name = getRouteName();
  const route = routes[name];
  currentRoute = name;

  if (typeof cleanup === 'function') {
    cleanup();
  }

  screenRoot.innerHTML = '';
  cleanup = route.screen.render(screenRoot);

  document.title = route.title + ' | BrainFlip';
  pageBack.hidden = name === 'home';

  const links = document.querySelectorAll('[data-route]');
  for (let i = 0; i < links.length; i++) {
    if (links[i].dataset.route === name) {
      links[i].setAttribute('aria-current', 'page');
    } else {
      links[i].removeAttribute('aria-current');
    }
  }

  closeMenu();
  if (!firstRender) {
    screenMain.focus();
  }
  firstRender = false;
}

pageBack.addEventListener('click', function () {
  goTo('home');
});

menuBtn.addEventListener('click', openMenu);

closeBtn.addEventListener('click', function () {
  closeMenu();
  menuBtn.focus();
});

scrim.addEventListener('click', closeMenu);

navList.addEventListener('click', function (event) {
  if (event.target.closest('a')) {
    closeMenu();
  }
});

for (let i = 0; i < brandLinks.length; i++) {
  brandLinks[i].addEventListener('click', function () {
    closeMenu();
  });
}

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && document.body.classList.contains('nav-open')) {
    closeMenu();
    menuBtn.focus();
  }
});

function handleHashChange() {
  const target = getRouteName();
  if (!isQuizRunning() || target === 'quiz') {
    renderRoute();
    return;
  }

  const targetHash = location.hash;
  history.replaceState(null, '', '#/quiz');
  closeMenu();
  if (asking) {
    return;
  }

  asking = true;
  askToLeaveQuiz().then(function (leave) {
    asking = false;
    if (leave) {
      resetQuiz();
      location.hash = targetHash || '#/home';
    }
  });
}

window.addEventListener('hashchange', handleHashChange);

window.addEventListener('beforeunload', function (event) {
  if (isQuizRunning()) {
    event.preventDefault();
    event.returnValue = '';
  }
});

setupAuthUi();
renderRoute();