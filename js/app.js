import * as home from './screens/home.js';
import * as flashcards from './screens/flashcards.js';
import * as quiz from './screens/quiz.js';
import * as results from './screens/results.js';
import * as decks from './screens/decks.js';
import * as review from './screens/review.js';

const routes = {
  home: { title: 'Home', screen: home },
  flashcards: { title: 'Flashcards', screen: flashcards },
  quiz: { title: 'Quiz', screen: quiz },
  results: { title: 'Results', screen: results },
  decks: { title: 'Decks', screen: decks },
  review: { title: 'Review Answers', screen: review },
};

const DEFAULT_ROUTE = 'home';

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
  const name = location.hash.replace(/^#\/?/, '');
  return Object.hasOwn(routes, name) ? name : DEFAULT_ROUTE;
}

function renderRoute() {
  const name = getRouteName();
  const route = routes[name];

  // Let the old screen stop its timers and listeners
  if (typeof cleanup === 'function') cleanup();

  screenRoot.innerHTML = '';
  cleanup = route.screen.render(screenRoot) ?? null;

  document.title = `${route.title} | BrainFlip`;
  document.querySelectorAll('[data-route]').forEach((link) => {
    if (link.dataset.route === name) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  closeMenu();
  if (!firstRender) screenRoot.focus();
  firstRender = false;
}

menuBtn.addEventListener('click', openMenu);
closeBtn.addEventListener('click', () => {
  closeMenu();
  menuBtn.focus();
});
scrim.addEventListener('click', closeMenu);
navList.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.body.classList.contains('nav-open')) {
    closeMenu();
    menuBtn.focus();
  }
});

window.addEventListener('hashchange', renderRoute);
renderRoute();