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

export function askToLeave(kind) {
  const words = MESSAGES[kind] || MESSAGES.quiz;

  return new Promise(function (resolve) {
    const dialog = document.createElement('dialog');
    dialog.className = 'confirm-dialog';
    dialog.setAttribute('aria-labelledby', 'confirm-title');
    dialog.setAttribute('aria-describedby', 'confirm-text');

    dialog.innerHTML = `
      <span class="confirm-icon">${ICONS.clock}</span>
      <h2 class="confirm-title" id="confirm-title"></h2>
      <p class="confirm-text" id="confirm-text"></p>
      <div class="confirm-actions">
        <button class="btn btn--primary" id="confirm-stay" type="button"></button>
        <button class="btn btn--outline" id="confirm-leave" type="button"></button>
      </div>
    `;
    dialog.querySelector('#confirm-title').textContent = words.title;
    dialog.querySelector('#confirm-text').textContent = words.text;
    dialog.querySelector('#confirm-stay').textContent = words.stay;
    dialog.querySelector('#confirm-leave').textContent = words.leave;

    let leave = false;

    dialog.querySelector('#confirm-stay').addEventListener('click', function () {
      dialog.close();
    });

    dialog.querySelector('#confirm-leave').addEventListener('click', function () {
      leave = true;
      dialog.close();
    });

    dialog.addEventListener('close', function () {
      dialog.remove();
      resolve(leave);
    });

    document.body.appendChild(dialog);
    dialog.showModal();
    dialog.querySelector('#confirm-stay').focus();
  });
}