import { SETTINGS } from './config.js';
import { escapeHtml, formatDuration } from './helpers.js';
import { ICONS } from './icons.js';

export function getQuizRules(count, isDaily) {
  const seconds = SETTINGS.secondsPerQuestion;
  const total = count * seconds;
  const rules = [
    'You have ' +
      formatDuration(total) +
      ' for the whole quiz (' +
      seconds +
      ' seconds for each of the ' +
      count +
      ' questions). One countdown runs for the entire quiz.',
    'The timer never pauses or resets. Moving between questions does not stop it.',
    'You can skip any question and come back to it later with Previous, Next or the numbered buttons.',
    'You can change an answer at any time before the quiz ends. Your latest choice counts.',
    'Brown numbers are answered questions. White numbers are not answered yet.',
    'Stay on this page. If you switch tabs or leave the page, you get one warning. If you do it again, the quiz ends.',
    'When time runs out, the quiz is submitted automatically with the answers you chose. Unanswered questions score zero.',
    'Do not refresh or close the page. Doing so ends the quiz and nothing is saved.',
    'Quizzes ended for leaving the page twice are saved to your progress, but they do not count on the leaderboard.',
  ];
  if (isDaily) {
    rules.push('You can play the daily challenge only once each day.');
  }
  return rules;
}

export function getFlashcardRules() {
  const seconds = SETTINGS.secondsPerQuestion;
  return [
    'Each card has its own ' + seconds + '-second timer. Use it to read the question and think of the answer.',
    'When the timer ends, the card flips by itself to show the answer. You can also flip it earlier.',
        'Flipping the card does not stop the timer. It stops only when you press Got it.',
    'Moving to another card starts a fresh timer for that card.',
    'Press Got it if you knew the answer. Press Review again if you did not. Those cards come back later.',
    'Leaving the deck ends the session, and your place in the deck is not saved.',
  ];
}

export function rulesHtml(rules) {
  let items = '';
  for (let i = 0; i < rules.length; i++) {
    items += '<li>' + escapeHtml(rules[i]) + '</li>';
  }
  return `
    <section class="rules" aria-labelledby="rules-title">
      <h2 class="rules-title" id="rules-title">${ICONS.warning}<span>Read these rules first</span></h2>
      <ol class="rules-list">${items}</ol>
      <label class="rules-agree">
        <input type="checkbox" id="rules-agree" />
        <span>I have read and understood the rules</span>
      </label>
    </section>
  `;
}

export function bindRules(root, button) {
  const box = root.querySelector('#rules-agree');
  button.disabled = !box.checked;
  box.addEventListener('change', function () {
    button.disabled = !box.checked;
  });
}