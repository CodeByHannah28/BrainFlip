import { setupAuthUi } from './auth-ui.js';
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

const screenRoot = document.getElementById('screen');
const menuBtn = document.getElementById('menu-btn');
const closeBtn = document.getElementById('close-btn');
const scrim = document.getElementById('scrim');
const navList = document.querySelector('.nav-list');

let cleanup = null;
let firstRender = true;

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

function renderRoute() {
  const name = getRouteName();
  const route = routes[name];

  if (typeof cleanup === 'function') {
    cleanup();
  }

  screenRoot.innerHTML = '';
  cleanup = route.screen.render(screenRoot);

  document.title = route.title + ' | BrainFlip';

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
    screenRoot.focus();
  }
  firstRender = false;
}

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

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && document.body.classList.contains('nav-open')) {
    closeMenu();
    menuBtn.focus();
  }
});

window.addEventListener('hashchange', renderRoute);

setupAuthUi();
renderRoute();
