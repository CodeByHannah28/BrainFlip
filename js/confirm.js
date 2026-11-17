import { ICONS } from './icons.js';

const MESSAGES = {
  quiz: {
    title: 'Leave the quiz?',
    text: 'You are in the middle of a quiz. Do you want to finish it before you move to another page, or end it now? If you end it now, your answers so far will be lost.',
    stay: 'Continue and finish the quiz',
    leave: 'End quiz now',
  },
  flashcards: {
    title: 'Leave your flashcards?',
    text: 'You are in the middle of a flashcard deck. Do you want to finish it before you move to another page, or end it now? If you end it now, you will start this deck from the beginning next time.',
    stay: 'Continue and finish the deck',
    leave: 'End session now',
  },
};

function openConfirm(words, icon) {
  return new Promise(function (resolve) {
    const dialog = document.createElement('dialog');
    dialog.className = 'confirm-dialog';
    dialog.setAttribute('aria-labelledby', 'confirm-title');
    dialog.setAttribute('aria-describedby', 'confirm-text');

    let secondHtml = '';
    if (words.second) {
      secondHtml = '<button class="btn btn--outline" id="confirm-leave" type="button"></button>';
    }

    dialog.innerHTML = `
      <span class="confirm-icon">${icon}</span>
      <h2 class="confirm-title" id="confirm-title"></h2>
      <p class="confirm-text" id="confirm-text"></p>
      <div class="confirm-actions">
        <button class="btn btn--primary" id="confirm-stay" type="button"></button>
        ${secondHtml}
      </div>
    `;
    dialog.querySelector('#confirm-title').textContent = words.title;
    dialog.querySelector('#confirm-text').textContent = words.text;
    dialog.querySelector('#confirm-stay').textContent = words.first;

    let second = false;

    dialog.querySelector('#confirm-stay').addEventListener('click', function () {
      dialog.close();
    });

    if (words.second) {
      dialog.querySelector('#confirm-leave').textContent = words.second;
      dialog.querySelector('#confirm-leave').addEventListener('click', function () {
        second = true;
        dialog.close();
      });
    }

    dialog.addEventListener('close', function () {
      dialog.remove();
      resolve(second);
    });

    document.body.appendChild(dialog);
    dialog.showModal();
    dialog.querySelector('#confirm-stay').focus();
  });
}

export function askToLeave(kind) {
  const words = MESSAGES[kind] || MESSAGES.quiz;
  return openConfirm({ title: words.title, text: words.text, first: words.stay, second: words.leave }, ICONS.clock);
}

export function askToSubmit(unanswered) {
  let text = 'You have 1 question without an answer. Go back to answer it, or submit the quiz now.';
  if (unanswered > 1) {
    text = 'You have ' + unanswered + ' questions without an answer. Go back to answer them, or submit the quiz now.';
  }
  return openConfirm(
    {
      title: 'Submit your quiz?',
      text: text,
      first: 'Go back to the quiz',
      second: 'Submit now',
    },
    ICONS.clock,
  );
}

export function showTabWarning() {
  return openConfirm(
    {
      title: 'Warning: you left the quiz page',
      text: 'You switched away from the quiz. The timer kept running. If you leave this page again, your quiz will end immediately and your answers so far will be submitted.',
      first: 'I understand, back to the quiz',
      second: '',
    },
    ICONS.warning,
  );
}